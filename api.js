// =====================================================================
// CONFIGURAÇÃO DA API — backend Node.js + PostgreSQL
// =====================================================================
// Troque pela URL pública do seu backend depois do deploy (ex: Render).
// Em desenvolvimento local, aponta para o servidor rodando na sua máquina.
window.AJOFER_API_BASE = window.AJOFER_API_BASE || 'http://localhost:3000';

(function(){
  const TOKEN_KEY = 'ajoferDashboard_token_v1';

  function getToken(){ try{ return localStorage.getItem(TOKEN_KEY); }catch(e){ return null; } }
  function setToken(t){ try{ localStorage.setItem(TOKEN_KEY, t); }catch(e){ /* ignora */ } }
  function clearToken(){ try{ localStorage.removeItem(TOKEN_KEY); }catch(e){ /* ignora */ } }

  async function apiFetch(path, options){
    options = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = getToken();
    if(token) headers['Authorization'] = 'Bearer ' + token;

    let resp;
    try{
      resp = await fetch(window.AJOFER_API_BASE + path, Object.assign({}, options, { headers }));
    }catch(networkErr){
      const err = new Error('Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente em instantes.');
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
