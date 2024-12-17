let activeTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
    const isActive = activeTabs.has(tab.id);
    
    if (!isActive) {
        // Activate
        await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            css: `
                .quick-copy-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #333;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    z-index: 999999;
                    animation: fadeInOut 2s ease-in-out;
                }
                @keyframes fadeInOut {
                    0% { opacity: 0; }
                    15% { opacity: 1; }
                    85% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `
        });

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: activate
        });

        activeTabs.add(tab.id);
        chrome.action.setIcon({
            tabId: tab.id,
            path: "icon-active.png"
        });
        chrome.action.setTitle({
            tabId: tab.id,
            title: "Click to deactivate Quick Copy"
        });
    } else {
        // Deactivate
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: deactivate
        });

        activeTabs.delete(tab.id);
        chrome.action.setIcon({
            tabId: tab.id,
            path: "icon-inactive.png"
        });
        chrome.action.setTitle({
            tabId: tab.id,
            title: "Click to activate Quick Copy"
        });
    }
});

function activate() {
    if (window.quickCopyActive) return;
    window.quickCopyActive = true;

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'quick-copy-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    function copyHandler() {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            const textarea = document.createElement('textarea');
            textarea.value = selectedText;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showNotification('Text copied!');
            } catch (err) {
                showNotification('Failed to copy');
            }
            document.body.removeChild(textarea);
        }
    }

    window.quickCopyHandler = copyHandler;
    document.addEventListener('mouseup', window.quickCopyHandler);
    showNotification('Quick Copy activated!');
}

function deactivate() {
    if (!window.quickCopyActive) return;
    
    document.removeEventListener('mouseup', window.quickCopyHandler);
    window.quickCopyActive = false;
    
    const notification = document.createElement('div');
    notification.className = 'quick-copy-notification';
    notification.textContent = 'Quick Copy deactivated!';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// Clean up on tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        activeTabs.delete(tabId);
        chrome.action.setIcon({
            tabId: tabId,
            path: "icon-inactive.png"
        });
    }
});

// Clean up on tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
    activeTabs.delete(tabId);
});