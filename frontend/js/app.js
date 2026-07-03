document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'http://localhost:8000/index.php?action=snippets';
    const snippetsList = document.getElementById('snippetsList');
    const snippetForm = document.getElementById('snippetForm');
    const formSection = document.querySelector('.form-section');

    // Carica snippet all'avvio
    loadSnippets();

    // Submit del form
    snippetForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const snippetData = {
            title: document.getElementById('title').value.trim(),
            language: document.getElementById('language').value,
            code: document.getElementById('code').value.trim(),
            notes: document.getElementById('notes').value.trim()
        };

        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snippetData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Errore durante il salvataggio');
            }

            const newSnippet = await response.json();

            // Aggiunge la card in cima con animazione
            const card = createSnippetCard(newSnippet);
            card.style.display = 'none';
            snippetsList.prepend(card);
            fadeIn(card);

            // Resetta il form
            snippetForm.reset();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            alert('Errore: ' + err.message);
        } finally {
            setLoading(false);
        }
    });

    // Funzione per caricare tutti gli snippet
    async function loadSnippets() {
        setLoading(true);

        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Errore nel caricamento');

            const snippets = await response.json();
            snippetsList.innerHTML = '';

            if (snippets.length === 0) {
                snippetsList.innerHTML = '<p class="loading">Nessuno snippet salvato ancora.</p>';
                return;
            }

            snippets.forEach(function (snippet, index) {
                const card = createSnippetCard(snippet);
                card.style.animationDelay = (index * 0.05) + 's';
                snippetsList.appendChild(card);
            });
        } catch (err) {
            snippetsList.innerHTML = '<p class="loading">Errore nel caricamento degli snippet.</p>';
        } finally {
            setLoading(false);
        }
    }

    // Funzione per eliminare uno snippet
    async function deleteSnippet(id, cardElement) {
        if (!confirm('Eliminare questo snippet definitivamente?')) return;

        try {
            const response = await fetch(API_URL + '&id=' + id, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Errore durante l\'eliminazione');
            }

            // Animazione di uscita
            cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'translateX(40px)';

            setTimeout(() => {
                cardElement.remove();
                // Se non ci sono più snippet, mostra messaggio
                if (snippetsList.children.length === 0) {
                    snippetsList.innerHTML = '<p class="loading">Nessuno snippet salvato ancora.</p>';
                }
            }, 300);
        } catch (err) {
            alert('Errore: ' + err.message);
        }
    }

    // Funzione per creare una card HTML
    function createSnippetCard(snippet) {
        const language = snippet.language || 'Other';
        const code = snippet.code || '';
        const notes = snippet.notes || '';
        const title = snippet.title || 'Senza titolo';
        const date = snippet.created_at
            ? new Date(snippet.created_at).toLocaleString('it-IT')
            : '';

        const card = document.createElement('div');
        card.className = 'snippet-card';
        card.dataset.id = snippet.id;

        card.innerHTML = `
            <div class="snippet-header">
                <h3>${escapeHtml(title)}</h3>
                <div class="snippet-header-actions">
                    <span class="snippet-badge">${escapeHtml(language)}</span>
                    <button class="btn-delete" title="Elimina snippet" aria-label="Elimina snippet">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="snippet-code">
                <pre>${escapeHtml(code)}</pre>
            </div>
            <p class="snippet-notes">${escapeHtml(notes)}</p>
            <p class="snippet-date">${date}</p>
        `;

        // Evento delete sul pulsante
        const deleteBtn = card.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', function () {
            deleteSnippet(snippet.id, card);
        });

        return card;
    }

    // Helper per loading state
    function setLoading(isLoading) {
        const submitBtn = snippetForm.querySelector('.btn-submit');
        const spinner = snippetForm.querySelector('.btn-spinner');

        if (isLoading) {
            submitBtn.disabled = true;
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
            submitBtn.querySelector('.btn-text').textContent = 'Salvataggio...';
        } else {
            submitBtn.disabled = false;
            const s = submitBtn.querySelector('.btn-spinner');
            if (s) s.remove();
            const icon = submitBtn.querySelector('.btn-icon');
            if (icon) icon.textContent = '+';
            const text = submitBtn.querySelector('.btn-text');
            if (text) text.textContent = 'Salva Snippet';
        }
    }

    // Helper per animazione fade-in
    function fadeIn(element) {
        element.style.display = '';
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';

        requestAnimationFrame(() => {
            element.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    // Helper per escaping HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});