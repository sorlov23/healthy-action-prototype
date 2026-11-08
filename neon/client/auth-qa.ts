import { createAuthClient } from '@neon/auth';

const AUTH_URL = 'https://ep-dark-meadow-baxrhac6.neonauth.c-8.eu-central-1.aws.neon.tech/rinlo/auth';
const DATA_URL = 'https://ep-dark-meadow-baxrhac6.apirest.c-8.eu-central-1.aws.neon.tech/rinlo/rest/v1';

const client = createAuthClient(AUTH_URL);
const $ = (id: string) => document.getElementById(id);
const status = $('neonQaStatus')!;
const account = $('neonQaAccount')!;
const readStatus = $('neonQaDataStatus')!;
const form = $('neonQaAuthForm') as HTMLFormElement;
const signOut = $('neonQaSignOut') as HTMLButtonElement;
const loginPanel = $('neonQaLoginPanel')!;
const nameWrap = $('neonQaNameWrap')!;
const register = $('neonQaRegister') as HTMLButtonElement;
const login = $('neonQaLogin') as HTMLButtonElement;
const read = $('neonQaRead') as HTMLButtonElement;
const reload = $('neonQaReload') as HTMLButtonElement;

let busy = false;
let userId: string | null = null;

function show(text: string, warning = false) {
  status.textContent = text;
  status.classList.toggle('warn', warning);
}
function setBusy(value: boolean) {
  busy = value;
  for (const b of [signOut, login, register, read, reload]) b.disabled = value;
}
function cleanError(error: any) {
  const code = String(error?.code || error?.status || '');
  if (code.includes('INVALID_EMAIL_OR_PASSWORD') || code.includes('INVALID_CREDENTIALS')) return 'Неверный email или пароль.';
  if (code.includes('USER_ALREADY_EXISTS')) return 'Такой email уже зарегистрирован. Используй вход.';
  if (code.includes('INVALID_ORIGIN')) return 'Адрес предварительной версии не разрешён в Neon Auth.';
  return String(error?.message || 'Сервис временно не ответил.').slice(0, 190);
}

async function refreshSession() {
  setBusy(true);
  try {
    const { data, error } = await client.getSession();
    if (error) throw error;
    const id = String(data?.user?.id || '');
    userId = id || null;
    const signedIn = Boolean(userId);
    loginPanel.hidden = signedIn;
    signOut.hidden = !signedIn;
    account.textContent = signedIn
      ? `Аккаунт Neon: ${String(data?.user?.email || 'email не указан')} · ID: ${id.slice(0, 8)}…`
      : 'Гостевой режим: все данные основного Rinlo остаются только на устройстве.';
    show(signedIn
      ? 'Сессия Neon подтверждена. Теперь можно проверить доступ к личной истории.'
      : 'Аккаунт Neon не подключён. Гостевой режим не требует регистрации.');
  } catch (error) {
    userId = null;
    loginPanel.hidden = false;
    signOut.hidden = true;
    show('Не удалось проверить сессию Neon: ' + cleanError(error), true);
  } finally {
    setBusy(false);
  }
}

async function signIn(event: Event) {
  event.preventDefault();
  if (busy) return;
  const fd = new FormData(form);
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const password = String(fd.get('password') || '');
  if (!email || !password) return;
  setBusy(true);
  show('Проверяю учётные данные…');
  try {
    const response = await client.signIn.email({ email, password });
    if (response.error) throw response.error;
    // Do not store access tokens or password in localStorage.
    (form.elements.namedItem('password') as HTMLInputElement).value = '';
    await refreshSession();
  } catch (error) {
    show('Вход не выполнен: ' + cleanError(error), true);
  } finally {
    setBusy(false);
  }
}

async function registerAccount() {
  if (busy) return;
  const fd = new FormData(form);
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const password = String(fd.get('password') || '');
  const name = String(fd.get('name') || '').trim() || email.split('@')[0] || 'Rinlo';
  if (!email || password.length < 8) {
    show('Для регистрации нужен корректный email и пароль от 8 символов.', true);
    return;
  }
  setBusy(true);
  show('Создаю отдельный новый аккаунт Neon…');
  try {
    const response = await client.signUp.email({ email, password, name });
    if (response.error) throw response.error;
    (form.elements.namedItem('password') as HTMLInputElement).value = '';
    await refreshSession();
  } catch (error) {
    show('Регистрация не выполнена: ' + cleanError(error), true);
  } finally {
    setBusy(false);
  }
}

async function logOut() {
  if (busy) return;
  setBusy(true);
  try {
    const r = await client.signOut();
    if (r.error) throw r.error;
    userId = null;
    await refreshSession();
  } catch (error) {
    show('Не удалось выйти: ' + cleanError(error), true);
  } finally {
    setBusy(false);
  }
}

async function checkApi() {
  if (busy) return;
  setBusy(true);
  readStatus.textContent = 'Проверяю Neon Data API…';
  try {
    let token = '';
    if (userId) {
      const { data, error } = await client.token();
      if (error) throw error;
      token = String(data?.token || '');
      if (!token) throw new Error('Neon Auth не вернул JWT. Запрос остановлен.');
    }
    const response = await fetch(`${DATA_URL}/rinlo_decisions?select=id&limit=5`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!userId) {
      const message = String((await response.json().catch(() => ({})))?.message || '');
      const unauthorizedDenied = response.status === 401 || response.status === 403
        || (response.status === 400 && /missing authentication credentials/i.test(message));
      readStatus.textContent = unauthorizedDenied
        ? 'PASS: Neon Data API отклонил запрос без JWT (HTTP ' + response.status + ').'
        : 'FAIL: запрос без JWT вернул HTTP ' + response.status + ', требуется проверка политики.';
      return;
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data)) throw new Error('Neon Data API вернул HTTP ' + response.status);
    readStatus.textContent = `PASS: авторизованный запрос принят; получено ${data.length} решений (не более 5). Для полной проверки изоляции нужен второй пользователь.`;
  } catch (error) {
    readStatus.textContent = 'FAIL: ' + cleanError(error);
  } finally {
    setBusy(false);
  }
}

form.addEventListener('submit', signIn);
register.addEventListener('click', registerAccount);
signOut.addEventListener('click', logOut);
read.addEventListener('click', checkApi);
reload.addEventListener('click', refreshSession);
nameWrap.hidden = false;
void refreshSession();
