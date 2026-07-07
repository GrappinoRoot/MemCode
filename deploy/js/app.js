document.addEventListener('DOMContentLoaded', function () {
    const authModal = document.getElementById('authModal')
    const btnLogin = document.getElementById('btnLogin')
    const btnRegister = document.getElementById('btnRegister');
    const authClose = document.getElementById('authClose');
    const authTitle = document.getElementById('authTitle');
    const authSubmit = document.getElementById('authSubmit');
    const authForm = document.getElementById('authForm');
    const authToggleLink = document.getElementById('authToggleLink');
    const API_URL = window.location.origin + '/api/snippets.php?action=snippets';
    const snippetsList = document.getElementById('snippetsList');
    const snippetForm = document.getElementById('snippetForm');
    const formSection = document.querySelector('.form-section');
    const searchInput = document.getElementById('searchInput');
    const filterLanguage = document.getElementById('filterLanguage');
    const filterCategory = document.getElementById('filterCategory');
    const formTitle = document.getElementById('title');
    const formLanguage = document.getElementById('language');
    const formCategory = document.getElementById('category');
    const formCode = document.getElementById('code');
    const formNotes = document.getElementById('notes');
    const submitBtn = snippetForm.querySelector('.btn-submit');
    const btnIcon = submitBtn.querySelector('.btn-icon');
    const btnText = submitBtn.querySelector('.btn-text');
    const userInfo = document.getElementById('userInfo');
    const userDisplayName = document.getElementById('userDisplayName');
    const btnLogout = document.getElementById('btnLogout');
    const authButtons = document.querySelector('.auth-buttons');

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return headers;
    }

    let allSnippets = [];
    let editingId = null;
    let isLoginMode = true;

    // Carica snippet all'avvio
    loadSnippets();
    checkAuthState();

    // Ricerca e filtro live
    searchInput.addEventListener('input', filterAndRender);
    filterLanguage.addEventListener('change', filterAndRender);
    filterCategory.addEventListener('change', filterAndRender);

    // Submit del form (create o update)
    snippetForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const snippetData = {
            title: formTitle.value.trim(),
            language: formLanguage.value,
            category: formCategory.value,
            code: formCode.value.trim(),
            notes: formNotes.value.trim()
        };

        if (editingId) {
            snippetData.id = editingId;
        }

        setLoading(true);

        try {
            const method = editingId ? 'PUT' : 'POST';
            const response = await fetch(API_URL, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(snippetData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Errore durante il salvataggio');
            }

            const result = await response.json();

            if (editingId) {
                const index = allSnippets.findIndex(function (s) {
                    return s.id == editingId;
                });
                if (index !== -1) {
                    allSnippets[index] = result;
                }
                editingId = null;
            } else {
                allSnippets.unshift(result);
            }

            filterAndRender();
            resetForm();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            alert('Errore: ' + err.message);
        } finally {
            setLoading(false);
        }
    });

    btnLogin.addEventListener('click', () => openAuthModal(true));
    btnRegister.addEventListener('click', () => openAuthModal(false));
    authClose.addEventListener('click', closeAuthModal);
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateAuthModal();
    });

    function openAuthModal(loginMode) {
        isLoginMode = loginMode;
        updateAuthModal();
        authModal.style.display = 'flex';
    }

    function closeAuthModal() {
        authModal.style.display = 'none';
    }

    function updateAuthModal() {
        const usernameGroup = document.getElementById('authUsernameGroup');
        const confirmGroup = document.getElementById('authConfirmGroup');
        const usernameInput = document.getElementById('authUsername');
        const confirmInput = document.getElementById('authConfirm');
        if (isLoginMode) {
            authTitle.textContent = 'Accedi';
            authSubmit.textContent = 'Accedi';
            authToggleLink.textContent = 'Registrati';
            authToggleLink.parentElement.firstChild.textContent = 'Non hai un account? ';
            usernameGroup.style.display = 'none';
            confirmGroup.style.display = 'none';
            usernameInput.required = false;
            confirmInput.required = false;
        } else {
            authTitle.textContent = 'Registrati';
            authSubmit.textContent = 'Crea account';
            authToggleLink.textContent = 'Accedi';
            authToggleLink.parentElement.firstChild.textContent = 'Hai già un account? ';
            usernameGroup.style.display = 'block';
            confirmGroup.style.display = 'block';
            usernameInput.required = true;
            confirmInput.required = true;
        }
    }

    // Submit form autenticazione
    authForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;

        if (isLoginMode) {
            // LOGIN
            try {
                const response = await fetch(window.location.origin + '/api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'login',
                        email: email,
                        password: password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Errore durante il login');
                }

                // Salva token in localStorage
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('authUser', JSON.stringify(data.user));

                showLoggedIn(data.user);
                closeAuthModal();
                // Ricarica snippet per questo utente
                loadSnippets();
            } catch (err) {
                alert('Errore: ' + err.message);
            }
        } else {
            // REGISTRAZIONE
            const username = document.getElementById('authUsername').value.trim();
            const confirm = document.getElementById('authConfirm').value;

            if (password !== confirm) {
                alert('Le password non coincidono');
                return;
            }
            if (!username) {
                alert('Inserisci un username');
                return;
            }

            try {
                const response = await fetch(window.location.origin + '/api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'register',
                        username: username,
                        email: email,
                        password: password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Errore durante la registrazione');
                }

                // Salva token in localStorage
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('authUser', JSON.stringify(data.user));

                showLoggedIn(data.user)
                closeAuthModal();
                // Ricarica snippet per questo utente
                loadSnippets();
            } catch (err) {
                alert('Errore: ' + err.message);
            }
        }

        // Resetta i campi del form auth
        authForm.reset();
    });


    function filterAndRender() {
        const query = searchInput.value.toLowerCase().trim();
        const lang = filterLanguage.value;
        const cat = filterCategory.value;

        const filtered = allSnippets.filter(function (snippet) {
            if (lang && (snippet.language || '').toLowerCase() !== lang) return false;
            if (cat && (snippet.category || '') !== cat) return false;

            if (query) {
                const title = (snippet.title || '').toLowerCase();
                const notes = (snippet.notes || '').toLowerCase();
                const code = (snippet.code || '').toLowerCase();
                if (!title.includes(query) && !notes.includes(query) && !code.includes(query)) {
                    return false;
                }
            }

            return true;
        });

        snippetsList.innerHTML = '';

        if (filtered.length === 0) {
            snippetsList.innerHTML = '<p class="loading">Nessuno snippet corrisponde alla ricerca.</p>';
            return;
        }

        filtered.forEach(function (snippet, index) {
            const card = createSnippetCard(snippet);
            card.style.animationDelay = (index * 0.05) + 's';
            snippetsList.appendChild(card);
        });

        document.querySelectorAll('.snippet-code pre code').forEach(function (block) {
            hljs.highlightElement(block);
        });
    }

    async function loadSnippets() {
        setLoading(true);

        try {
            const response = await fetch(API_URL, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Errore nel caricamento');

            allSnippets = await response.json();
            filterAndRender();
        } catch (err) {
            snippetsList.innerHTML = '<p class="loading">Errore nel caricamento degli snippet.</p>';
        } finally {
            setLoading(false);
        }
    }

    function editSnippet(snippet) {
        editingId = snippet.id;
        formTitle.value = snippet.title || '';
        formLanguage.value = snippet.language || 'other';
        formCategory.value = snippet.category || '';
        formCode.value = snippet.code || '';
        formNotes.value = snippet.notes || '';

        btnIcon.textContent = '';
        btnText.textContent = 'Aggiorna Snippet';

        window.scrollTo({ top: 0, behavior: 'smooth' });
        formTitle.focus();
    }

    function resetForm() {
        snippetForm.reset();
        editingId = null;
        btnIcon.textContent = '+';
        btnText.textContent = 'Salva Snippet';
    }

    async function deleteSnippet(id, cardElement) {
        if (!confirm('Eliminare questo snippet definitivamente?')) return;

        try {
            const response = await fetch(API_URL + '&id=' + id, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Errore durante l\'eliminazione');
            }

            cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'translateX(40px)';

            setTimeout(() => {
                allSnippets = allSnippets.filter(function (s) {
                    return s.id != id;
                });
                filterAndRender();
            }, 300);
        } catch (err) {
            alert('Errore: ' + err.message);
        }
    }

    function createSnippetCard(snippet) {
        const language = snippet.language || 'other';
        const code = snippet.code || '';
        const notes = snippet.notes || '';
        const title = snippet.title || 'Senza titolo';
        const category = snippet.category || '';
        const date = snippet.created_at
            ? new Date(snippet.created_at).toLocaleString('it-IT')
            : '';

        const card = document.createElement('div');
        card.className = 'snippet-card';
        card.dataset.id = snippet.id;

        const categoryHtml = category
            ? '<span class="snippet-category">' + escapeHtml(category) + '</span>'
            : '';

        card.innerHTML = `
            <div class="snippet-header">
                <div class="snippet-header-info">
                    <h3>${escapeHtml(title)}</h3>
                    <div class="snippet-meta">
                        ${categoryHtml}
                        <span class="snippet-badge">${escapeHtml(language)}</span>
                    </div>
                </div>
                <div class="snippet-header-actions">
                    <button class="btn-edit" title="Modifica snippet" aria-label="Modifica snippet">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-delete" title="Elimina snippet" aria-label="Elimina snippet">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="snippet-code">
                <div class="snippet-code-header">
                    <span class="snippet-code-lang">${escapeHtml(language)}</span>
                    <button class="btn-copy" title="Copia codice" aria-label="Copia codice">
                        <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span class="copy-text">Copia</span>
                    </button>
                </div>
                <pre><code class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre>
            </div>
            <p class="snippet-notes">${escapeHtml(notes)}</p>
            <p class="snippet-date">${date}</p>
        `;

        const editBtn = card.querySelector('.btn-edit');
        editBtn.addEventListener('click', function () {
            editSnippet(snippet);
        });

        const deleteBtn = card.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', function () {
            deleteSnippet(snippet.id, card);
        });

        const copyBtn = card.querySelector('.btn-copy');
        copyBtn.addEventListener('click', function () {
            copyToClipboard(code, copyBtn);
        });

        return card;
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            let spinner = submitBtn.querySelector('.btn-spinner');
            if (!spinner) {
                const s = document.createElement('span');
                s.className = 'btn-spinner';
                s.innerHTML = `
                    <svg class="spinner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-linecap="round"></circle>
                    </svg>
                `;
                submitBtn.prepend(s);
            }
            submitBtn.querySelector('.btn-icon').textContent = '';
            submitBtn.querySelector('.btn-text').textContent = editingId ? 'Aggiornamento...' : 'Salvataggio...';
        } else {
            submitBtn.disabled = false;
            const s = submitBtn.querySelector('.btn-spinner');
            if (s) s.remove();
        }
    }

    function copyToClipboard(text, button) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showCopyFeedback(button);
            }).catch(function () {
                fallbackCopy(text, button);
            });
        } else {
            fallbackCopy(text, button);
        }
    }

    function fallbackCopy(text, button) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopyFeedback(button);
        } catch (e) {
            alert('Impossibile copiare. Seleziona il codice manualmente.');
        }
        document.body.removeChild(textarea);
    }

    function showCopyFeedback(button) {
        const textSpan = button.querySelector('.copy-text');
        const iconSvg = button.querySelector('.copy-icon');
        const originalText = textSpan.textContent;

        textSpan.textContent = 'Copiato!';
        button.classList.add('btn-copy--success');
        if (iconSvg) {
            iconSvg.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
        }

        setTimeout(function () {
            textSpan.textContent = originalText;
            button.classList.remove('btn-copy--success');
            if (iconSvg) {
                iconSvg.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
            }
        }, 2000);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Controlla se utente già loggato all'avvio
    function checkAuthState() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('authUser');

        if (token && userData) {
            const user = JSON.parse(userData);
            showLoggedIn(user);
        } else {
            showLoggedOut();
        }
    }

    function showLoggedIn(user) {
        authButtons.style.display = 'none'
        userInfo.style.display = 'flex'
        userDisplayName.textContent = user.username || user.email;
    }

    function showLoggedOut() {
        authButtons.style.display = 'flex'
        userInfo.style.display = 'none'
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
    }

    // Logout
    btnLogout.addEventListener('click', async function () {
        const token = localStorage.getItem('authToken');

        if (token) {
            try {
                await fetch(window.location.origin + '/api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout', token: token })
                });
            } catch (e) {
                // Ignora errori di logout
            }
        }

        showLoggedOut();
        alert('Logout effettuato');
    });
});