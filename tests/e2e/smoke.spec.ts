import { expect, type Page, test } from '@playwright/test';

async function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return errors;
}

function relevantConsoleErrors(errors: string[]) {
  return errors.filter((entry) =>
    !entry.includes('auth/invalid-api-key') &&
    !entry.includes('net::ERR_NETWORK_ACCESS_DENIED')
  );
}

test('login page renders without a framework error overlay', async ({ page }) => {
  const errors = await collectConsoleErrors(page);

  await page.goto('/login');

  await expect(page).toHaveTitle(/MoneyTrack/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByText('Internal server error')).toHaveCount(0);

  expect(relevantConsoleErrors(errors)).toEqual([]);
});

test('root redirects anonymous users to login', async ({ page }) => {
  const errors = await collectConsoleErrors(page);

  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(relevantConsoleErrors(errors)).toEqual([]);
});

test('auth navigation exposes signup and forgot-password flows', async ({ page }) => {
  const errors = await collectConsoleErrors(page);

  await page.goto('/login');
  await page.getByRole('link', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Get started' })).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeVisible();

  await page.getByRole('link', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();

  expect(relevantConsoleErrors(errors)).toEqual([]);
});

test('signup form validates required and mismatched password fields', async ({ page }) => {
  const errors = await collectConsoleErrors(page);

  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByText('Required')).toHaveCount(3);

  await page.getByLabel('Full name').fill('Demo User');
  await page.getByLabel('Email address').fill('demo@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password-one');
  await page.getByLabel('Confirm password').fill('password-two');
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByText('Passwords do not match')).toBeVisible();
  expect(relevantConsoleErrors(errors)).toEqual([]);
});

test('login page remains usable at a narrow mobile viewport', async ({ page }) => {
  const errors = await collectConsoleErrors(page);
  await page.setViewportSize({ width: 393, height: 852 });

  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'MoneyTrack' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  expect(relevantConsoleErrors(errors)).toEqual([]);
});

test('demo workspace opens the signed-in app without console errors', async ({ page }) => {
  const errors = await collectConsoleErrors(page);

  await page.goto('/login');
  await page.getByRole('button', { name: 'Explore Demo Workspace' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Demo workspace')).toBeVisible();
  await expect(page.locator('h1').first()).toContainText(/Demo Laptop Fund|Emergency Fund|Demo Travel Fund/);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Demo workspace')).toBeVisible();

  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
  await expect(page.getByText('What should I do next?')).toBeVisible();

  await page.getByRole('link', { name: 'Debts & Loans' }).click();
  await expect(page.getByRole('heading', { name: 'Obligations' })).toBeVisible();
  await expect(page.getByText('Due in 14 days')).toBeVisible();

  expect(relevantConsoleErrors(errors)).toEqual([]);
});
