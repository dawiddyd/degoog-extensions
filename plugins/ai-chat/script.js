(function () {
  'use strict';

  const API_URL = 'https://api.openai.com/v1/chat/completions';
  let conversationHistory = [];
  let apiKey = '';
  let model = 'gpt-4o-mini';
  let searchQuery = '';

  function escapeHtml(s) {
    if (s == null) return '';
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  function markdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown
      .replace(/\u0026/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<em><strong>$1</strong></em>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.*?)___/g, '<em><strong>$1</strong></em>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
      return '<pre><code>' + code.trim() + '</code></pre>';
    });
    
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(\u003cli>.*\u003c\/li>\n?)+/g, '<ul>$1</ul>');
    
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(\u003cli>.*\u003c\/li>\n?)+/gs, function(match) {
      if (match.includes('<ul>')) return match;
      return '<ol>' + match + '</ol>';
    });
    
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    html = html.replace(/\[([0-9]+)\]/g, '<span class="ai-citation" data-index="$1">[$1]</span>');
    
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }

  function getContainer() {
    return document.querySelector('.ai-chat-result');
  }

  function initChat() {
    const container = getContainer();
    if (!container) return;

    searchQuery = container.getAttribute('data-query') || '';
    apiKey = container.getAttribute('data-api-key') || '';
    model = container.getAttribute('data-model') || 'gpt-4o-mini';
    
    conversationHistory = [];
    
    if (searchQuery) {
      conversationHistory.push({ 
        role: 'system', 
        content: `You are a helpful AI assistant. The user searched for: "${searchQuery}". Provide helpful, accurate responses. Be concise but thorough.`
      });
    }

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

  async function sendMessage(message) {
    const container = getContainer();
    if (!container || !apiKey) {
      addMessageToUI('assistant', 'Error: API key not configured. Please configure your OpenAI API key in Settings.');
      return;
    }

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
          messages: conversationHistory,
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

    const messagesContainer = container.querySelector('.ai-chat-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${role}`;

    const isUser = role === 'user';
    const avatarSvg = isUser 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';

    const formattedContent = markdownToHtml(content);

    messageDiv.innerHTML = `
      <div class="ai-avatar">${avatarSvg}</div>
      <div class="ai-message-content">${formattedContent}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  function showLoading() {
    const container = getContainer();
    if (!container) return null;

    const messagesContainer = container.querySelector('.ai-chat-messages');
    if (!messagesContainer) return null;

    const id = 'ai-loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = id;
    loadingDiv.className = 'ai-message ai-message-loading';
    loadingDiv.innerHTML = `
      <div class="ai-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="ai-message-content">
        <div class="ai-typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;

    messagesContainer.appendChild(loadingDiv);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    setTimeout(initChat, 100);
  }

  const observer = new MutationObserver(function(mutations) {
    const container = getContainer();
    if (container && !container.hasAttribute('data-ai-initialized')) {
      container.setAttribute('data-ai-initialized', 'true');
      initChat();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
