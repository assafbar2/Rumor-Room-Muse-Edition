import { test, expect, type Page, type Route } from '@playwright/test';

const storageKey = 'rumor-room:v1';
const caseId = 't1-leaked-launch';
const question = 'What do you remember about the launch date?';
const replyText = 'I saw the date on the card, but I cannot confirm the year.';

async function openQuestion(page: Page) {
  await page.goto(`./#case=${caseId}`);
  await page.getByRole('tab', { name: 'Witness', exact: true }).click();
  await page.getByRole('button', { name: 'Ask your own question' }).click();
  await page.getByLabel(/^Your question to /).fill(question);
}

async function savedGame(page: Page) {
  return page.evaluate(
    ({ storageKey, caseId }) => JSON.parse(localStorage.getItem(storageKey)!).games[caseId],
    { storageKey, caseId },
  );
}

function answer(route: Route, text = replyText, statementIds = ['w2']) {
  const request = route.request().postDataJSON();
  return route.fulfill({
    json: {
      requestId: request.requestId,
      reply: { text, statementIds, origin: 'live', model: 'openai/gpt-6-astra' },
    },
  });
}

test('saves before sending, suppresses duplicates, and lets evidence reading continue', async ({
  page,
}) => {
  let held: Route | undefined;
  let calls = 0;
  await page.route('**/api/ai/witness*', (route) => {
    calls++;
    held = route;
  });
  await page.goto(`./#case=${caseId}`);
  await page.getByTestId('claim-c1').click();
  await page.getByTestId('move-primary').click();
  await page.getByRole('tab', { name: 'Witness', exact: true }).click();
  await page.getByRole('button', { name: 'Ask your own question' }).click();
  await page.getByLabel(/^Your question to /).fill(question);
  await page.getByRole('button', { name: 'Ask the witness', exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  expect((await savedGame(page)).pendingRequestId).toBe(held!.request().postDataJSON().requestId);
  await page.locator('.live-witness form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(page.getByRole('button', { name: 'Waiting for the witness…' })).toBeDisabled();
  await expect(page.getByTestId('make-verdict')).toBeDisabled();
  await expect(page.getByTestId('move-second')).toBeDisabled();
  await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  await page.getByRole('button', { name: /E4 Release status and artifact register/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Witness', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Waiting for the witness…' })).toBeVisible();
  expect(calls).toBe(1);
  await answer(held!);
  await expect(page.locator('.live-testimony')).toContainText(replyText);
  await expect(page.getByTestId('make-verdict')).toBeEnabled();
  expect((await savedGame(page)).liveDispatchesUsed).toBe(1);
  expect((await savedGame(page)).liveReplies).toHaveLength(1);
  await page.reload();
  await page.getByRole('tab', { name: 'Witness', exact: true }).click();
  await expect(page.locator('.live-testimony')).toContainText(replyText);
  expect(calls).toBe(1);
});

test('a refreshed pending interview is not resent and prepared play remains available', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/ai/witness*', () => {
    calls++;
  });
  await openQuestion(page);
  await page.getByRole('button', { name: 'Ask the witness', exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'It was not resent' })).toBeVisible();
  expect((await savedGame(page)).pendingRequestId).toBeNull();
  await expect(page.getByTestId('make-verdict')).toBeEnabled();
  await page.getByRole('tab', { name: 'Witness', exact: true }).click();
  await page.getByTestId('question-w2').click();
  expect((await savedGame(page)).pendingRequestId).toBeNull();
  expect((await savedGame(page)).liveDispatchesUsed).toBe(1);
  expect(calls).toBe(1);
});

test('catalog-first recovery can open another case before resuming the interrupted run', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/ai/witness*', () => {
    calls++;
  });
  await openQuestion(page);
  await page.getByRole('button', { name: 'Ask the witness', exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  await page.goto('./');
  await page.getByRole('link', { name: 'Open case 2: The Velvet Rope' }).click();
  await page.getByTestId('claim-c2').click();
  await page.getByTestId('move-primary').click();
  await page.getByRole('button', { name: 'All cases', exact: true }).click();
  await page.getByRole('link', { name: 'Open case 1: The Leaked Launch' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'It was not resent' })).toBeVisible();
  await expect(page.getByTestId('make-verdict')).toBeEnabled();
  expect((await savedGame(page)).pendingRequestId).toBeNull();
  expect((await savedGame(page)).liveDispatchesUsed).toBe(1);
  expect(calls).toBe(1);
});

test('failures use dispatches without spending prepared interview turns', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/ai/witness*', (route) => {
    calls++;
    return route.fulfill({ status: 503, json: { error: { code: 'AI_UNAVAILABLE' } } });
  });
  await openQuestion(page);
  const submit = page.getByRole('button', { name: 'Ask the witness', exact: true });
  await submit.click();
  await expect(page.locator('.inline-error[role=alert]')).toContainText('prepared questions');
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(page.locator('.inline-error[role=alert]')).toContainText('prepared questions');
  await page.getByTestId('question-w1').click();
  await page.getByTestId('question-w2').click();
  const saved = await savedGame(page);
  expect(saved.liveDispatchesUsed).toBe(2);
  expect(saved.liveReplies).toHaveLength(0);
  expect(saved.interviewIds).toEqual(['w1', 'w2']);
  expect(calls).toBe(2);
});

test('leaving a pending run and replaying cannot attach its late response', async ({ page }) => {
  let held: Route | undefined;
  await page.route('**/api/ai/witness*', (route) => {
    held = route;
  });
  await openQuestion(page);
  const originalId = (await savedGame(page)).gameId;
  await page.getByRole('button', { name: 'Ask the witness', exact: true }).click();
  await expect.poll(() => held !== undefined).toBe(true);
  await page.getByRole('button', { name: 'All cases', exact: true }).click();
  await page.getByRole('link', { name: 'Open case 2: The Velvet Rope' }).click();
  await answer(held!).catch(() => {}); // The navigation may already have aborted the request.
  await expect(page.getByRole('heading', { name: 'The Velvet Rope', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'All cases', exact: true }).click();
  await page.getByRole('link', { name: 'Open case 1: The Leaked Launch' }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: 'Start this case over' }).click();
  const saved = await savedGame(page);
  expect(saved.gameId).not.toBe(originalId);
  expect(saved.liveReplies).toHaveLength(0);
  expect(saved.liveDispatchesUsed).toBe(0);
});

test('an active interview survives another tab saving a separate case', async ({
  page,
  context,
}) => {
  let held: Route | undefined;
  await page.route('**/api/ai/witness*', (route) => {
    held = route;
  });
  await openQuestion(page);
  const other = await context.newPage();
  await other.goto('./#case=t2-velvet-rope');
  await page.getByRole('button', { name: 'Ask the witness', exact: true }).click();
  await expect.poll(() => held !== undefined).toBe(true);
  await other.getByTestId('claim-c2').click();
  await other.getByTestId('move-primary').click();
  expect((await savedGame(page)).pendingRequestId).toBe(held!.request().postDataJSON().requestId);
  await expect(page.getByRole('button', { name: 'Waiting for the witness…' })).toBeVisible();
  await answer(held!);
  await expect(page.locator('.live-testimony')).toContainText(replyText);
  await other.reload();
  await expect(other.getByTestId('research-left')).toHaveText('3');
  await page.reload();
  await page.getByRole('tab', { name: 'Witness', exact: true }).click();
  await expect(page.locator('.live-testimony')).toContainText(replyText);
});

test('a pending marker survives another tab’s save and a refresh before the reply', async ({
  page,
  context,
}) => {
  let calls = 0;
  await page.route('**/api/ai/witness*', () => {
    calls++;
  });
  await openQuestion(page);
  const other = await context.newPage();
  await other.goto('./#case=t2-velvet-rope');
  await page.getByRole('button', { name: 'Ask the witness', exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  await other.getByTestId('claim-c2').click();
  await other.getByTestId('move-primary').click();
  expect((await savedGame(page)).pendingRequestId).not.toBeNull();
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'It was not resent' })).toBeVisible();
  expect((await savedGame(page)).pendingRequestId).toBeNull();
  await other.getByTestId('move-second').click();
  expect((await savedGame(page)).pendingRequestId).toBeNull();
  await expect(page.getByTestId('make-verdict')).toBeEnabled();
  expect(calls).toBe(1);
  await page.getByRole('tab', { name: 'Witness', exact: true }).click();
  await page.getByTestId('question-w2').click();
  await other.reload();
  await expect(other.getByTestId('research-left')).toHaveText('2');
});

test('rejects an unrelated response and accepts the exact grounded refusal', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/ai/witness*', (route) => {
    calls++;
    if (calls === 1)
      return route.fulfill({
        json: {
          requestId: 'wrong-run',
          reply: {
            text: replyText,
            statementIds: ['w2'],
            origin: 'live',
            model: 'openai/gpt-6-astra',
          },
        },
      });
    return answer(route, "That isn't in my notes.", []);
  });
  await openQuestion(page);
  await page.getByRole('button', { name: 'Ask the witness', exact: true }).click();
  await expect(page.locator('.inline-error[role=alert]')).toBeVisible();
  await expect(page.locator('.live-testimony')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ask the witness', exact: true }).click();
  await expect(page.locator('.live-testimony')).toContainText("That isn't in my notes.");
  expect((await savedGame(page)).liveReplies).toHaveLength(1);
});

test('the server route rejects non-POST and wrong-origin requests before inference', async ({
  request,
}) => {
  const wrongMethod = await request.get('api/ai/witness');
  expect(wrongMethod.status()).toBe(405);
  expect(wrongMethod.headers()['allow']).toBe('POST');
  const forbidden = await request.post('api/ai/witness', {
    headers: { Origin: 'https://unrelated.example' },
    data: { question },
  });
  expect(forbidden.status()).toBe(403);
});
