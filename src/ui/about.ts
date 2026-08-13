export interface AboutDeps {
  t: (key: string) => string;
  updated: string;
  version: string;
}

export function createAboutDialog(deps: AboutDeps): HTMLDialogElement {
  const { t, updated, version } = deps;
  const dialog = document.createElement('dialog');
  dialog.className = 'about';
  dialog.innerHTML = `
    <h2>${t('app.title')}</h2>
    <p class="about-subtitle">${t('app.subtitle')}</p>
    <p class="about-disclaimer">${t('disclaimer.text')}</p>
    <p class="about-meta">${t('shows.updated')}: ${updated}</p>
    <p class="about-meta">Map data © OpenStreetMap contributors · v${version}</p>
    <form method="dialog"><button class="about-close">OK</button></form>
  `;
  document.body.append(dialog);
  return dialog;
}
