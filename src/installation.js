let installPrompt = null;
let installedThisSession = false;
const installed = () =>
  installedThisSession ||
  window.matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener("appinstalled", () => {
  installedThisSession = true;
  installPrompt = null;
  document.querySelector('[data-action="install-app"]')?.remove();
});

export function installationButton() {
  return installed() ? "" :
    '<button class="secondary-button wide" data-action="install-app">Installer sur cet appareil</button>';
}

export async function installApp() {
  const dialog = document.getElementById("install-dialog");
  const instructions = document.getElementById("install-instructions");
  if (installed()) {
    instructions.textContent = "EXASCALE est déjà ouvert en mode application.";
  } else {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      try {
        await prompt.prompt();
        return;
      } catch (error) {
        console.warn("Installation native indisponible", error);
      }
    }
    const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    instructions.textContent = appleMobile
      ? "Ouvrez EXASCALE dans Safari. Touchez Partager, puis Sur l’écran d’accueil. Activez « Ouvrir comme app web » si cette option apparaît, puis touchez Ajouter."
      : /Android/.test(navigator.userAgent)
        ? "Dans Chrome, ouvrez le menu ⋮, puis choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil »."
        : "Cherchez l’option « Installer l’application » dans la barre d’adresse ou dans le menu du navigateur.";
  }
  dialog.showModal();
}

if (window.isSecureContext && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("../sw.js", import.meta.url))
    .catch((error) => console.warn("Mode hors connexion indisponible", error));
}
