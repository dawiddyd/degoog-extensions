(function () {
  'use strict';

  let conversationHistory = [];
  let apiKey = '';
  let model = 'gpt-4o-mini';

  function escapeHtml(s) {
    if (s == null) return '';
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  function getContainer() {
    return document.querySelector('.ai-mode-result');
  }

  function getQuery() {
    const container = getContainer();
    return container?.getAttribute('data-query') || '';
  }

  async function sendMessage(message) {
    const container = getContainer();
    if (!container || !apiKey) return;

    addMessageToUI('user', message);

    conversationHistory.push({ role: 'user', content: message });

    const loadingId = showLoading();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI assistant integrated into a search engine. The user is asking follow-up questions about their search query: "${getQuery()}". Provide helpful, accurate responses. Be concise but thorough.`
            },
            ...conversationHistory
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      hideLoading(loadingId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      conversationHistory.push({ role: 'assistant', content: aiResponse });

      addMessageToUI('assistant', aiResponse);

    } catch (err) {
      hideLoading(loadingId);
      addMessageToUI('assistant', `Error: ${err.message}. Please check your API key and try again.`);
    }
  }

  function addMessageToUI(role, content) {
    const container = getContainer();
    if (!container) return;

    const responseContent = container.querySelector('.ai-response-content');
    if (!responseContent) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${role}`;

    const isUser = role === 'user';
    const avatarSvg = isUser 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';

    const formattedContent = escapeHtml(content).replace(/\n/g, '<br>');

    messageDiv.innerHTML = `
      <div class="ai-avatar">${avatarSvg}</div>
      <div class="ai-message-content">${formattedContent}</div>
    `;

    responseContent.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  function showLoading() {
    const container = getContainer();
    if (!container) return null;

    const responseContent = container.querySelector('.ai-response-content');
    if (!responseContent) return null;

    const id = 'ai-loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = id;
    loadingDiv.className = 'ai-loading';
    loadingDiv.innerHTML = `
      <div class="ai-loading-spinner"></div>
      <span class="ai-loading-text">AI is thinking...</span>
    `;

    responseContent.appendChild(loadingDiv);
    loadingDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

    return id;
  }

  function hideLoading(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function handleSend() {
    const container = getContainer();
    if (!container) return;

    const input = container.querySelector('.ai-chat-input');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    sendMessage(message);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function init() {
    const container = getContainer();
    if (!container) return;

    apiKey = container.getAttribute('data-api-key') || '';
    model = container.getAttribute('data-model') || 'gpt-4o-mini';

    const sendBtn = container.querySelector('.ai-chat-send');
    const input = container.querySelector('.ai-chat-input');

    if (sendBtn) {
      sendBtn.addEventListener('click', handleSend);
    }

    if (input) {
      input.addEventListener('keydown', handleKeydown);
    }

    container.addEventListener('click', function(e) {
      const citation = e.target.closest('.ai-citation');
      if (citation) {
        const index = citation.getAttribute('data-index');
        const sourceLink = container.querySelector(`.ai-source-link[data-index="${index}"]`);
        if (sourceLink) {
          sourceLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sourceLink.style.background = 'var(--primary, #1a73e8)';
          sourceLink.style.color = 'white';
          setTimeout(() => {
            sourceLink.style.background = '';
            sourceLink.style.color = '';
          }, 1000);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  const observer = new MutationObserver(function(mutations) {
    const container = getContainer();
    if (container && !container.hasAttribute('data-ai-initialized')) {
      container.setAttribute('data-ai-initialized', 'true');
      init();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
