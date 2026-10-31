import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cases } from '../../lib/game/cases';

test('the shelf and investigation fit compact phones and tablet breakpoints', async ({ page }) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: 'Open case 1: The Leaked Launch' }).click();
    await expect(page.getByTestId('claim-c1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('the complete case shelf is accessible and loads its own artwork', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const failures: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('./');
  await expect(page.getByTestId('case-card')).toHaveCount(10);
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole('heading', { name: 'A little scandal. A lot of evidence.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: `artifacts/${testInfo.project.name}/catalog.png` });
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'How to play' })).toBeFocused();
  await page.getByRole('button', { name: 'Deep cuts', exact: true }).click();
  await expect(page.getByTestId('case-card')).toHaveCount(4);
  await page.getByLabel('Filter by genre').selectOption('Nightlife & status');
  await expect(page.getByRole('heading', { name: 'A different kind of trouble?' })).toBeVisible();
  await page.getByRole('button', { name: 'See the collection' }).click();
  await expect(page.getByTestId('case-card')).toHaveCount(10);
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

test('claim selection brings research choices into view without spending a turn', async ({
  page,
}, testInfo) => {
  await page.goto('./#case=t2-velvet-rope');
  const heading = page.locator('.research-panel h3');
  await page.locator('.claim-card[aria-pressed="true"]').click();
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect(page.getByTestId('move-primary')).toBeInViewport();
  await expect(page.getByTestId('research-left')).toHaveText('4');

  const otherId = await page
    .locator('.claim-card[aria-pressed="false"]')
    .first()
    .getAttribute('data-testid');
  const other = page.getByTestId(otherId!);
  await other.focus();
  await page.keyboard.press('Enter');
  await expect(other).toHaveAttribute('aria-pressed', 'true');
  await expect(heading).toBeFocused();
  await expect(page.getByTestId('move-primary')).toBeInViewport();
  await expect(page.getByTestId('research-left')).toHaveText('4');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await other.focus();
  await page.keyboard.press('Space');
  await expect(heading).toBeFocused();
  await expect(page.getByTestId('move-primary')).toBeInViewport();
  await expect(page.getByTestId('research-left')).toHaveText('4');
  await page.screenshot({ path: `artifacts/${testInfo.project.name}/research-navigation.png` });

  await page.getByTestId('move-primary').click();
  await expect(page.getByTestId('research-left')).toHaveText('3');
});

for (const c of cases)
  test(`${c.number}. ${c.title} plays to a cited 130-point verdict without an API`, async ({
    page,
  }, testInfo) => {
    const calls: string[] = [];
    await page.route('**/api/**', (route) => {
      calls.push(route.request().url());
      return route.abort();
    });
    await page.goto(`./#case=${c.id}`);
    await expect(page.getByRole('heading', { name: c.title, exact: true })).toBeVisible();
    await page.getByTestId(`claim-${c.verdict.falseClaimId}`).click();
    await page.getByTestId('move-second').click();
    await page.getByTestId('move-primary').click();
    await expect(page.getByTestId('research-left')).toHaveText('2');
    await page
      .getByRole('button', {
        name: new RegExp(c.sources[3].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      })
      .click();
    await expect(page.getByRole('dialog')).toContainText(c.sources[3].body);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('tab', { name: 'Exhibit', exact: true }).click();
    await expect(page.getByRole('tabpanel')).toContainText(c.artifact.comparisonNote);
    await page.getByRole('button', { name: 'Pin this clue · free', exact: true }).click();
    await page.getByRole('tab', { name: 'Witness', exact: true }).click();
    await page.getByTestId('question-w2').click();
    await expect(page.getByRole('tabpanel')).toContainText(c.witness.statements[1].text);
    if (c.number === 1) {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: `artifacts/${testInfo.project.name}/investigation.png`,
        fullPage: true,
      });
    }
    await page.getByTestId('make-verdict').click();
    await expect(page.getByRole('dialog')).toContainText(
      c.claims.find((x) => x.id === c.verdict.falseClaimId)!.text,
    );
    await page.getByTestId('lock-verdict').click();
    await expect(page.locator('#receipt-title')).toBeFocused();
    await expect(page.getByTestId('receipt-score')).toHaveText('130');
    await expect(page.getByTestId('receipt')).toContainText(c.verdict.explanation);
    await expect(page.getByTestId('receipt')).toContainText('Your research');
    await expect(page.getByTestId('receipt')).toContainText('Revealed at verdict');
    if (c.number === 1) {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: `artifacts/${testInfo.project.name}/receipt.png`,
        fullPage: true,
      });
    }
    expect(calls).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.reload();
    await expect(page.getByTestId('receipt-score')).toHaveText('130');
  });

test('progress survives refresh, keeps case saves separate and explains a wrong verdict', async ({
  page,
}) => {
  await page.goto('./#case=t1-leaked-launch');
  await page.getByTestId('claim-c4').click();
  await page.getByTestId('move-fresh').click();
  await expect(page.getByRole('tabpanel')).toContainText('No matching update in this case file.');
  await page.reload();
  await expect(page.getByTestId('research-left')).toHaveText('3');
  await page.getByRole('button', { name: 'All cases', exact: true }).click();
  await page.getByRole('link', { name: 'Open case 2: The Velvet Rope' }).click();
  await expect(page.getByTestId('research-left')).toHaveText('4');
  await page.getByRole('button', { name: 'All cases', exact: true }).click();
  await page.getByRole('link', { name: 'Open case 1: The Leaked Launch' }).click();
  await expect(page.getByTestId('research-left')).toHaveText('3');
  await page.getByTestId('claim-c2').click();
  await page.getByTestId('make-verdict').click();
  await page.getByTestId('lock-verdict').click();
  await expect(page.getByTestId('receipt-score')).toHaveText('0');
  await expect(page.getByTestId('receipt')).toContainText('Your pick was supported:');
  await expect(page.getByTestId('receipt')).toContainText('Developer preview input guide');
});

test('the original artifact crop and transcript are available by keyboard', async ({ page }) => {
  await page.goto('./#case=t1-leaked-launch');
  await expect(page.getByTestId('claim-c1')).toBeVisible();
  await page.getByRole('link', { name: 'Skip to the game' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#case=t1-leaked-launch$/);
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('tab', { name: 'Evidence', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Exhibit', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Enlarge exhibit and read transcript' }).click();
  await expect(page.getByRole('dialog')).toContainText('01 NOV 2026');
  await expect(page.getByRole('dialog')).toContainText('asset revision: p017');
  await page.getByRole('button', { name: 'Prepared crop', exact: true }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Enlarge exhibit and read transcript' }),
  ).toBeFocused();
});

test('two tabs preserve separate cases, and reset/replay have explicit scopes', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await page.goto('./');
  await other.goto('./');
  await page.getByRole('link', { name: 'Open case 1: The Leaked Launch' }).click();
  await page.getByTestId('claim-c1').click();
  await page.getByTestId('move-primary').click();
  await other.getByRole('link', { name: 'Open case 2: The Velvet Rope' }).click();
  await other.getByTestId('claim-c2').click();
  await other.getByTestId('move-primary').click();
  await page.reload();
  await expect(page.getByTestId('research-left')).toHaveText('3');
  await other.reload();
  await expect(other.getByTestId('research-left')).toHaveText('3');
  await page.getByTestId('claim-c1').click();
  await page.getByTestId('make-verdict').click();
  await page.getByTestId('lock-verdict').click();
  await expect(page.getByTestId('receipt-score')).toHaveText('145');
  await page.getByRole('button', { name: 'Replay this case' }).click();
  await expect(page.getByTestId('research-left')).toHaveText('4');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: 'Keep investigating' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'All cases', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open case 1: The Leaked Launch' })).toContainText(
    'CASE CLOSED',
  );
  await page.getByRole('button', { name: 'Reset my progress' }).click();
  await page.getByRole('button', { name: 'Keep my progress' }).click();
  await expect(page.getByRole('link', { name: 'Open case 1: The Leaked Launch' })).toContainText(
    'CASE CLOSED',
  );
  await page.getByRole('button', { name: 'Reset my progress' }).click();
  await page.getByRole('button', { name: 'Clear all progress' }).click();
  await page.reload();
  await expect(page.getByText('CASE CLOSED', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Open case 2: The Velvet Rope' }).click();
  await expect(page.getByTestId('research-left')).toHaveText('4');
});

test('no-key static play survives denied storage and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage denied');
      },
    });
  });
  await page.goto('./#case=t1-leaked-launch');
  await expect(
    page.getByRole('status').filter({ hasText: 'storage is unavailable' }),
  ).toBeVisible();
  await page.getByTestId('claim-c1').click();
  await page.getByTestId('make-verdict').click();
  await page.getByTestId('lock-verdict').click();
  await expect(page.getByTestId('receipt-score')).toHaveText('160');
  await expect(page.getByTestId('receipt')).toContainText('without researching any source');
  await expect(page.getByRole('button', { name: 'Ask your own question' })).toHaveCount(0);
});
