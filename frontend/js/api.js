// =====================================================================
// CONFIGURAÇÃO DA API — backend Flask (Python) + PostgreSQL
// =====================================================================
// 1) Depois de publicar o backend no Render, cole a URL dele abaixo
//    (sem "/" no final), por exemplo: https://ajofer-dashboard-backend.onrender.com
// 2) Em desenvolvimento local, o site usa automaticamente http://localhost:3000
const PRODUCTION_API = 'https://ajoferhorasextras.onrender.com'; //render incluído

const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
window.AJOFER_API_BASE = window.AJOFER_API_BASE || (IS_LOCAL ? 'http://localhost:3000' : PRODUCTION_API);

(function(){
  const TOKEN_KEY = 'ajoferDashboard_token_v1';

  function getToken(){ try{ return localStorage.getItem(TOKEN_KEY); }catch(e){ return null; } }
  function setToken(t){ try{ localStorage.setItem(TOKEN_KEY, t); }catch(e){ /* ignora */ } }
  function clearToken(){ try{ localStorage.removeItem(TOKEN_KEY); }catch(e){ /* ignora */ } }

  async function apiFetch(path, options){
    options = options || {};

    if(window.AJOFER_API_BASE.includes('SEU-BACKEND')){
      const err = new Error('A URL do backend ainda não foi configurada em js/api.js (PRODUCTION_API).');
      err.network = true;
      throw err;
    }

    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = getToken();
    if(token) headers['Authorization'] = 'Bearer ' + token;

    let resp;
    try{
      resp = await fetch(window.AJOFER_API_BASE + path, Object.assign({}, options, { headers }));
    }catch(networkErr){
      const err = new Error('Não foi possível conectar ao servidor. Se o backend estava parado, aguarde cerca de 1 minuto e tente de novo.');
      err.network = true;
      throw err;
    }

    let data = null;
    try{ data = await resp.json(); }catch(e){ /* corpo vazio */ }

    if(!resp.ok){
      const err = new Error((data && data.error) || 'Ocorreu um erro inesperado.');
      err.status = resp.status;
      throw err;
    }
    return data;
  }

  window.AjoferAPI = { apiFetch, getToken, setToken, clearToken };
})();
