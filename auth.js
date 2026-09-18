// =====================================================================
// AUTENTICAÇÃO — login, cadastro de funcionário e recuperação de senha
// (fala com o backend Node.js + PostgreSQL configurado em AJOFER_API_BASE)
// =====================================================================
(function(){
  const { apiFetch, getToken, setToken, clearToken } = window.AjoferAPI;

  const screens = {
    login: document.getElementById('screen-login'),
    forgot: document.getElementById('screen-forgot'),
    register: document.getElementById('screen-register'),
    dashboard: document.getElementById('screen-dashboard'),
  };

  function showScreen(name){
    Object.values(screens).forEach(s=>{ if(s) s.style.display='none'; });
    if(screens[name]) screens[name].style.display = (name==='dashboard') ? 'block' : 'flex';
    window.scrollTo(0,0);
  }

  // ---------- validação de senha (mesma regra aplicada no backend) ----------
  const SPECIAL_RE = /[_\/@.#$%&*!?\-]/;
  function passwordRules(pw){
    return {
      len: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      num: /[0-9]/.test(pw),
      special: SPECIAL_RE.test(pw),
    };
  }
  function passwordValid(pw){
    const r = passwordRules(pw);
    return r.len && r.upper && r.num && r.special;
  }
  function renderPwRules(ulEl, pw){
    if(!ulEl) return;
    const r = passwordRules(pw);
    ulEl.querySelectorAll('li').forEach(li=>{
      const rule = li.getAttribute('data-rule');
      li.classList.toggle('ok', !!r[rule]);
    });
  }

  function setFieldError(fieldId, isError){
    const el = document.getElementById(fieldId);
    if(el) el.classList.toggle('error', !!isError);
  }
  function showAlert(alertId, msg){
    const el = document.getElementById(alertId);
    if(!el) return;
    el.textContent = msg;
    el.classList.add('show');
  }
  function hideAlert(alertId){
    const el = document.getElementById(alertId);
    if(!el) return;
    el.classList.remove('show');
    el.textContent = '';
  }
  function setLoading(btn, loading, loadingLabel){
    if(!btn) return;
    if(loading){
      btn.dataset.originalLabel = btn.dataset.originalLabel || btn.textContent;
      btn.textContent = loadingLabel || 'Enviando...';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.originalLabel || btn.textContent;
      btn.disabled = false;
    }
  }

  // ---------- mostrar/ocultar senha ----------
  document.querySelectorAll('.pw-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const input = document.getElementById(btn.getAttribute('data-toggle'));
      if(!input) return;
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      btn.textContent = isPw ? 'Ocultar' : 'Mostrar';
    });
  });

  let currentUser = null; // {id, nome, email, username, role}

  async function enterDashboard(user){
    currentUser = user;
    const label = document.getElementById('loggedUserLabel');
    if(label) label.textContent = user.username;
    showScreen('dashboard');
    if(window.initAjoferDashboard) await window.initAjoferDashboard();
  }

  // ---------- LOGIN ----------
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    hideAlert('loginAlert');
    setFieldError('fieldLoginUser', false);
    setFieldError('fieldLoginPass', false);

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    let hasError = false;
    if(!username){ setFieldError('fieldLoginUser', true); hasError = true; }
    if(!password){ setFieldError('fieldLoginPass', true); hasError = true; }
    if(hasError) return;

    const submitBtn = loginForm.querySelector('button[type=submit]');
    setLoading(submitBtn, true, 'Entrando...');
    try{
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(data.token);
      await enterDashboard(data.user);
    }catch(err){
      showAlert('loginAlert', err.message || 'Login ou senha inválidos.');
    }finally{
      setLoading(submitBtn, false);
    }
  });

  document.getElementById('goForgot').addEventListener('click', ()=>{
    hideAlert('loginAlert');
    document.getElementById('forgotForm').reset();
    hideAlert('forgotAlert'); hideAlert('forgotSuccess');
    showScreen('forgot');
  });
  document.getElementById('backToLoginFromForgot').addEventListener('click', ()=> showScreen('login'));

  // ---------- ESQUECI SENHA ----------
  const forgotPwInput = document.getElementById('forgotPassword');
  forgotPwInput.addEventListener('input', ()=> renderPwRules(document.getElementById('forgotPwRules'), forgotPwInput.value));

  const forgotForm = document.getElementById('forgotForm');
  forgotForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    hideAlert('forgotAlert'); hideAlert('forgotSuccess');
    ['fieldForgotUser','fieldForgotEmail','fieldForgotPass','fieldForgotPass2'].forEach(id=>setFieldError(id,false));

    const username = document.getElementById('forgotUsername').value.trim();
    const email = document.getElementById('forgotEmail').value.trim();
    const pw = document.getElementById('forgotPassword').value;
    const pw2 = document.getElementById('forgotPassword2').value;

    let hasError = false;
    if(!username){ setFieldError('fieldForgotUser', true); hasError = true; }
    if(!email){ setFieldError('fieldForgotEmail', true); hasError = true; }
    if(!passwordValid(pw)){ setFieldError('fieldForgotPass', true); hasError = true; }
    if(pw !== pw2 || !pw2){ setFieldError('fieldForgotPass2', true); hasError = true; }
    if(hasError) return;

    const submitBtn = forgotForm.querySelector('button[type=submit]');
    setLoading(submitBtn, true, 'Redefinindo...');
    try{
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ username, email, newPassword: pw }),
      });
      showAlert('forgotSuccess', 'Senha redefinida com sucesso! Você já pode entrar com a nova senha.');
      forgotForm.reset();
      setTimeout(()=> showScreen('login'), 1600);
    }catch(err){
      showAlert('forgotAlert', err.message || 'Não encontramos um usuário com esse login e e-mail.');
    }finally{
      setLoading(submitBtn, false);
    }
  });

  // ---------- CADASTRO DE FUNCIONÁRIO ----------
  document.getElementById('btnGoRegister').addEventListener('click', ()=>{
    document.getElementById('registerForm').reset();
    hideAlert('registerAlert'); hideAlert('registerSuccess');
    renderPwRules(document.getElementById('regPwRules'), '');
    showScreen('register');
  });
  document.getElementById('goRegisterFromLogin').addEventListener('click', ()=>{
    document.getElementById('registerForm').reset();
    hideAlert('registerAlert'); hideAlert('registerSuccess');
    renderPwRules(document.getElementById('regPwRules'), '');
    showScreen('register');
  });
  document.getElementById('backFromRegister').addEventListener('click', ()=>{
    showScreen(currentUser ? 'dashboard' : 'login');
  });

  const regPwInput = document.getElementById('regPassword');
  regPwInput.addEventListener('input', ()=> renderPwRules(document.getElementById('regPwRules'), regPwInput.value));

  const registerForm = document.getElementById('registerForm');
  registerForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    hideAlert('registerAlert'); hideAlert('registerSuccess');
    ['fieldRegName','fieldRegEmail','fieldRegUser','fieldRegPass','fieldRegPass2'].forEach(id=>setFieldError(id,false));

    const nome = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const pw = document.getElementById('regPassword').value;
    const pw2 = document.getElementById('regPassword2').value;

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let hasError = false;
    if(!nome){ setFieldError('fieldRegName', true); hasError = true; }
    if(!EMAIL_RE.test(email)){ setFieldError('fieldRegEmail', true); hasError = true; }
    if(!username || username.length < 3){ setFieldError('fieldRegUser', true); hasError = true; }
    if(!passwordValid(pw)){ setFieldError('fieldRegPass', true); hasError = true; }
    if(pw !== pw2 || !pw2){ setFieldError('fieldRegPass2', true); hasError = true; }
    if(hasError){
      showAlert('registerAlert', 'Verifique os campos destacados abaixo.');
      return;
    }

    const submitBtn = registerForm.querySelector('button[type=submit]');
    setLoading(submitBtn, true, 'Cadastrando...');
    try{
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nome, email, username, password: pw }),
      });
      showAlert('registerSuccess', `Funcionário "${nome}" cadastrado com sucesso! Já é possível entrar com o login "${username}".`);
      registerForm.reset();
      renderPwRules(document.getElementById('regPwRules'), '');
      setTimeout(()=>{
        showScreen(currentUser ? 'dashboard' : 'login');
      }, 1800);
    }catch(err){
      setFieldError('fieldRegUser', err.status === 409);
      showAlert('registerAlert', err.message || 'Não foi possível cadastrar o funcionário.');
    }finally{
      setLoading(submitBtn, false);
    }
  });

  // ---------- LOGOUT ----------
  document.getElementById('btnLogout').addEventListener('click', ()=>{
    clearToken();
    currentUser = null;
    document.getElementById('loginForm').reset();
    hideAlert('loginAlert');
    showScreen('login');
  });

  // ---------- INIT: tenta restaurar sessão a partir do token salvo ----------
  (async function initAuth(){
    const hint = document.getElementById('seedHint');
    if(hint){
      hint.innerHTML = 'Ainda não tem uma conta? Use o link <b>"Cadastro de funcionário"</b> abaixo para criar seu primeiro acesso.';
    }

    const token = getToken();
    if(!token){
      showScreen('login');
      return;
    }
    try{
      const data = await apiFetch('/api/auth/me');
      await enterDashboard(data.user);
    }catch(err){
      clearToken();
      showScreen('login');
    }
  })();
})();
