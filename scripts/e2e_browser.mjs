// Recorre la versión compilada como lo haría una persona en el móvil, incluido el modo sin conexión.
// Antes: base local limpia, `npx vite preview --port 5173` y `npm run demo:seed` (ver docs/desarrollo.md).
//   npm run test:browser                 usa Chrome de Windows, o la ruta de CHROME_BIN
//   COLOR_SCHEME=dark npm run test:browser
// Deja las capturas en .capturas/.
import { mkdirSync, rmSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:5173";
const OUT = new URL("../.capturas/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const SCHEME = process.env.COLOR_SCHEME ?? "light";
const CHROME = process.env.CHROME_BIN ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
});

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && extra ? ` (${extra})` : ""}`);
  if (!ok) failed++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(context) {
  const page = await context.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: SCHEME }]);
  page.on("pageerror", (e) => {
    console.log("PAGEERROR", e.message);
    failed++;
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !/401|Failed to load resource/.test(m.text())) console.log("CONSOLE", m.text().slice(0, 200));
  });
  page.on("dialog", (d) => d.accept());
  return page;
}

const text = (page) => page.evaluate(() => document.body.innerText);
async function clickText(page, label, selector = "button, a") {
  const done = await page.evaluate(
    (label, selector) => {
      const el = [...document.querySelectorAll(selector)].find((e) => e.innerText.trim() === label || e.innerText.trim().split(/\s*\n\s*/).pop() === label || e.getAttribute("aria-label") === label);
      if (!el) return false;
      el.click();
      return true;
    },
    label,
    selector
  );
  if (!done) throw new Error(`No encuentro «${label}»`);
  await wait(450);
}
const shot = (page, name) => page.screenshot({ path: `${OUT}${name}.png` });

async function login(page, user, pass) {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.waitForSelector('input[name="username"]');
  await page.type('input[name="username"]', user);
  await page.type('input[name="password"]', pass);
  await page.keyboard.press("Enter");
  await page.waitForSelector(".dock", { timeout: 15000 });
  await wait(2500);
}

const alex = await browser.createBrowserContext();
const page = await open(alex);
await login(page, "alex", "demo-local-123");
await shot(page, "01-hoy");
check("Hoy muestra a la pareja", (await text(page)).includes("Sam"));
check("Hoy propone rutina", (await text(page)).includes("Te toca"));

// El service worker queda activo
const sw = await page.evaluate(async () => {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
  return !!reg?.active;
});
check("service worker activo", sw);
await wait(1500);

// Sesión persistente
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector(".dock");
check("sigue con la sesión al recargar", (await text(page)).includes("Hola, Alex"));

// Entrenar
await clickText(page, "Entrenar");
await wait(500);
await shot(page, "02-entrenar");
const train = await text(page);
check("hay 3 rutinas", ["Pecho y tríceps", "Espalda y bíceps", "Pierna y hombro"].every((r) => train.includes(r)));

await clickText(page, "Hoy", "button");
const starts = await page.$$(".routine--next .btn--primary");
await starts[0].click();
await page.waitForSelector(".session");
await wait(600);
await shot(page, "03-sesion");
const before = await text(page);
check("la sesión recuerda el peso anterior", before.includes("Última vez"), before.slice(0, 300));

// Cortar la red: en el gym no hay cobertura
await page.setOfflineMode(true);
await wait(300);
const firstCard = '.session__list > li:nth-child(2)';
const weightBefore = await page.$eval(`${firstCard} .step__value`, (e) => e.textContent);
await page.click(`${firstCard} .step__btn:last-child`);
await wait(200);
const weightAfter = await page.$eval(`${firstCard} .step__value`, (e) => e.textContent);
check("el botón + sube al siguiente peso", weightBefore !== weightAfter, `${weightBefore} -> ${weightAfter}`);
await page.click(`${firstCard} .tick`);
await wait(500);
await page.click('.session__list > li:nth-child(3) .tick');
await wait(500);
await page.click('.session__list > li:nth-child(1) .tick');
await wait(500);
await shot(page, "04-sesion-sin-cobertura");
check("marca ejercicios sin cobertura", (await text(page)).includes("2 de 5"));

// Cerrar y reabrir la app sin cobertura
await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
await wait(2500);
await shot(page, "05-reabierta-sin-cobertura");
const reopened = await text(page);
check("la app abre sin cobertura y conserva el entreno", reopened.includes("2 de 5"), reopened.slice(0, 200));

await page.setOfflineMode(false);
await wait(4000);
const workoutsServer = await page.evaluate(async () => (await fetch("/api/workouts")).json());
check("al volver la cobertura se envía", workoutsServer.some((w) => w.entries.filter((e) => e.done).length === 2 && !w.finishedAt));

// Terminar
for (const n of [4, 5, 6]) {
  await page.click(`.session__list > li:nth-child(${n}) .tick`);
  await wait(250);
}
await clickText(page, "Terminar entreno");
await wait(800);
await shot(page, "06-terminado");
check("pantalla final", (await text(page)).includes("¡Hecho!"));
await clickText(page, "Volver");
await wait(3000);

// Sam recibe el aviso y responde
const sam = await browser.createBrowserContext();
const page2 = await open(sam);
await login(page2, "sam", "demo-local-456");
await clickText(page2, "Dúo");
await wait(1500);
await shot(page2, "07-chat-sam");
const chat = await text(page2);
check("Sam ve que Alex ha terminado", /Alex ha terminado/.test(chat));
await page2.type(".composer input", "¡Bravo! 🔥");
await page2.keyboard.press("Enter");
await wait(300);
await clickText(page2, "💪 ¡Vamos al gym!");
await wait(2000);
await shot(page2, "08-chat-enviado");

await clickText(page2, "Comparar");
await wait(700);
await shot(page2, "09-comparar");
check("comparar muestra a los dos", (await text(page2)).includes("Alex") && (await text(page2)).includes("Kilos movidos"));
await clickText(page2, "Alex");
await wait(900);
await page2.screenshot({ path: `${OUT}10-ver-alex.png`, fullPage: true });
check("Sam ve los entrenos de Alex", (await text(page2)).includes("Sus entrenos"));
check("el peso de Alex sigue oculto", !(await text(page2)).includes("Su peso"));

// Alex recibe mensajes
await clickText(page, "Dúo");
await wait(6500);
await shot(page, "11-chat-alex");
check("Alex recibe el mensaje de Sam", (await text(page)).includes("¡Bravo!"));
await clickText(page, "Sam");
await wait(900);
check("Alex ve el peso de Sam porque lo comparte", (await text(page)).includes("Su peso"));

// Progreso
await clickText(page, "Progreso");
await wait(900);
await page.screenshot({ path: `${OUT}12-progreso.png`, fullPage: true });
await clickText(page, "Ejercicios");
await wait(600);
const firstTracked = await page.$(".tracked");
await firstTracked.click();
await wait(1000);
await page.screenshot({ path: `${OUT}13-ejercicios.png` });
check("hay evolución por ejercicio", (await text(page)).includes("Máximo"));
await clickText(page, "Calendario");
await wait(800);
await page.screenshot({ path: `${OUT}14-calendario.png`, fullPage: true });
await clickText(page, "Peso");
await wait(800);
await shot(page, "15-peso");

// Editor de rutinas
await clickText(page, "Entrenar");
await wait(500);
const edit = await page.$(".routine__edit");
await edit.click();
await page.waitForSelector(".editor-row");
await wait(500);
await page.screenshot({ path: `${OUT}16-editor.png`, fullPage: true });
await clickText(page, "Añadir ejercicio");
await wait(900);
await shot(page, "17-selector");
await page.type(".picker__search", "sentadilla");
await wait(500);
await shot(page, "18-busqueda");
check("el buscador encuentra en español", (await text(page)).includes("Sentadilla con barra"));
await page.$eval(".picker__search", (e) => {
  e.value = "";
});
await page.click(".picker__search", { clickCount: 3 });
await page.keyboard.press("Backspace");
await page.type(".picker__search", "squat");
await wait(500);
check("también encuentra en inglés", (await text(page)).includes("Sentadilla"));
await page.click(".picker__row");
await wait(700);
const added = await page.$$(".editor-row");
check("añade el ejercicio a la rutina", added.length === 6, String(added.length));

// Perfil
await page.goto(`${BASE}/perfil`, { waitUntil: "networkidle0" });
await wait(800);
await page.screenshot({ path: `${OUT}19-perfil.png`, fullPage: true });
await clickText(page, "Cambiar avatar");
await wait(700);
await shot(page, "22-avatares");
check("hay selector de avatares", (await text(page)).includes("Unicornio Gains"));
const pick = await page.evaluateHandle(() => [...document.querySelectorAll(".avatar-option")].find((b) => b.innerText.includes("Hámster en la Cinta")));
await pick.click();
await wait(900);
await shot(page, "23-avatar-elegido");
check("el avatar elegido muestra su nombre", (await page.$eval(".avatar-picker__who strong", (e) => e.textContent)) === "Hámster en la Cinta");
await clickText(page, "Listo");
await wait(500);
check("el perfil muestra el nombre del avatar", (await page.$eval(".profile-head", (e) => e.innerText)).includes("Hámster en la Cinta"));
await page.reload({ waitUntil: "networkidle0" });
await wait(500);
check("el avatar se conserva", (await page.$eval(".profile-head img", (e) => e.getAttribute("src"))).includes("hamster"));
await page2.reload({ waitUntil: "networkidle0" });
await wait(1500);
check("la pareja ve el avatar nuevo", await page2.evaluate(async () => (await (await fetch("/api/partner")).json()).partner.avatar === "hamster"));
check("privacidad visible", (await text(page)).includes("qué ve tu pareja"));

// Cerrar sesión borra el dispositivo
await clickText(page, "Cerrar sesión");
await wait(1200);
const leftovers = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("duo.") && k !== "duo.cache.v1"));
const cache = await page.evaluate(() => localStorage.getItem("duo.cache.v1") ?? "");
check("cerrar sesión no deja datos", leftovers.length === 0 && !cache.includes("Prensa") && !cache.includes("Alex"), JSON.stringify(leftovers));
check("vuelve al login", (await page.$('input[name="username"]')) !== null);

// Modo claro y ancho de escritorio
const light = await browser.createBrowserContext();
const p3 = await open(light);
await p3.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await login(p3, "sam", "demo-local-456");
await p3.screenshot({ path: `${OUT}20-claro.png` });
const overflow = await p3.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
check("sin scroll horizontal", !overflow);

for (const route of ["/entrenar", "/duo", "/progreso", "/progreso/ejercicios", "/perfil"]) {
  await p3.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
  await wait(500);
  const o = await p3.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`sin scroll horizontal en ${route}`, o <= 0, String(o));
}

// Selector de tema
const theme = () => p3.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }));
const DARK_BG = "rgb(18, 17, 15)";
const LIGHT_BG = "rgb(246, 243, 236)";
await p3.goto(`${BASE}/perfil`, { waitUntil: "networkidle0" });
await wait(500);
check("automático sigue al sistema (claro)", (await theme()).bg === LIGHT_BG);
await clickText(p3, "Oscuro");
check("Oscuro se aplica aunque el sistema esté en claro", (await theme()).bg === DARK_BG);
await p3.screenshot({ path: `${OUT}21-tema.png` });
await p3.reload({ waitUntil: "domcontentloaded" });
check("Oscuro sigue activo al reabrir, antes de cargar la app", (await p3.evaluate(() => document.documentElement.dataset.theme)) === "dark");
await wait(1500);
await clickText(p3, "Claro");
await p3.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await wait(200);
check("Claro se mantiene aunque el sistema esté en oscuro", (await theme()).bg === LIGHT_BG);
await clickText(p3, "Automático");
check("Automático vuelve a seguir al sistema", (await theme()).bg === DARK_BG);
await p3.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await wait(200);
check("Automático cambia solo cuando cambia el sistema", (await theme()).bg === LIGHT_BG);
await clickText(p3, "Oscuro");
await clickText(p3, "Cerrar sesión");
await wait(1200);
check("el tema se conserva al cerrar sesión", (await theme()).bg === DARK_BG);

await browser.close();
console.log(failed ? `HAY ${failed} FALLOS` : "TODO OK");
process.exit(failed ? 1 : 0);
