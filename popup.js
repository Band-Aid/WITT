document.addEventListener("DOMContentLoaded", function () {
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export Data';
    exportButton.addEventListener('click', () => {
        chrome.storage.local.get(null, (items) => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "localStorageData.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    });

    const importButton = document.createElement('button');
    importButton.textContent = 'Import Data';
    importButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        chrome.storage.local.set(data, () => {
                            console.log('Data imported successfully.');
                            location.reload(); // Reload to reflect the changes
                        });
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                    }
                };
                reader.readAsText(file);
            }
        });
        input.click();
    });

    document.body.appendChild(exportButton);
    document.body.appendChild(importButton);

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    chrome.storage.local.get(null, (items) => {
        for (let key in items) {
            const value = items[key];

            const tr = document.createElement('tr');
            const tdKey = document.createElement('td');
            const tdValue = document.createElement('td');
            const tdButton = document.createElement('td');
            const button = document.createElement('button');
            const img = document.createElement('img');

            tdKey.textContent = key;
            tdKey.id = key;
            img.src = value;
            img.alt = key;
            img.style.maxWidth = '500px'; // Adjust as needed
            tdValue.appendChild(img);
            button.textContent = 'Delete';
            button.addEventListener('click', () => {
                chrome.storage.local.remove(key, () => {
                    console.log('Item deleted:', key);
                    location.reload(); // Reload to reflect the changes
                });
            });
            tdButton.appendChild(button);

            tr.appendChild(tdKey);
            tr.appendChild(tdValue);
            tr.appendChild(tdButton);
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        document.body.appendChild(table);
    });
});