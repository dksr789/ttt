document.addEventListener('DOMContentLoaded', () => {
    const maxRetries = 3;  // Number of retry attempts

    const form = document.getElementById('resource-form');
    const downloadOptionsContainer = document.getElementById('download-options');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const pleaseWaitMessage = document.getElementById('please-wait');

    form.addEventListener('submit', event => {
        event.preventDefault();  // Prevent the default form submission

        const resourceId = document.getElementById('resource-id').value.trim();

        if (resourceId) {
            // Show "Please wait" message
            pleaseWaitMessage.style.display = 'block';
            downloadOptionsContainer.innerHTML = '';  // Clear any previous options
            progressContainer.style.display = 'none';  // Hide progress bar initially

            fetchResource(resourceId)
                .finally(() => {
                    // Hide "Please wait" message after fetch attempt is complete
                    pleaseWaitMessage.style.display = 'none';
                });
        } else {
            downloadOptionsContainer.textContent = 'Please enter a resource ID.';
        }
    });

    function fetchResource(resourceId) {
        return fetch(`/api/resources/${resourceId}/download`)
            .then(response => response.json())
            .then(data => {
                console.log('Fetched data:', data);  // Log data to inspect the structure

                downloadOptionsContainer.innerHTML = '';  // Clear any previous options
                progressContainer.style.display = 'none';  // Hide progress bar initially

                // Handle a single format
                if (data.data && data.data.url) {
                    const fileUrl = data.data.url;
                    const fileName = data.data.filename || 'downloaded-file';

                    // Get the file size
                    return fetchFileSize(fileUrl)
                        .then(fileSize => {
                            // Display file size and create a download button
                            const fileSizeText = formatBytes(fileSize);
                            const button = document.createElement('button');
                            button.textContent = `Download ${fileName} (${fileSizeText})`;
                            button.onclick = () => {
                                progressContainer.style.display = 'block';  // Show progress bar
                                startDownload(fileUrl, fileName, fileSize);
                            };
                            downloadOptionsContainer.appendChild(button);
                        })
                        .catch(err => {
                            console.error('Error fetching file size:', err);
                            downloadOptionsContainer.textContent = 'Error fetching file size.';
                        });
                } else {
                    downloadOptionsContainer.textContent = 'No download options available.';
                }
            })
            .catch(err => {
                downloadOptionsContainer.textContent = 'Error fetching data.';
            });
    }

    // Function to get the file size using a HEAD request
    function fetchFileSize(url) {
        return fetch(url, { method: 'HEAD' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const contentLength = response.headers.get('Content-Length');
                return contentLength ? parseInt(contentLength, 10) : null; // Return null if Content-Length is not available
            });
    }

    // Function to start the download with retry logic
    function startDownload(url, fileName, fileSize) {
        let attempt = 0;

        function tryDownload() {
            attempt++;
            fetchFile(url, fileName, fileSize)
                .then(() => {
                    document.getElementById('progress-text').textContent = 'Download complete.';
                })
                .catch(err => {
                    if (attempt < maxRetries) {
                        document.getElementById('progress-text').textContent = `Retrying (${attempt}/${maxRetries})...`;
                        tryDownload();
                    } else {
                        document.getElementById('progress-text').textContent = 'Download failed.';
                    }
                });
        }

        tryDownload();
    }

    // Function to fetch and download a file
    function fetchFile(url, fileName, fileSize) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return new Response(response.body); // Handle response as a stream
            })
            .then(response => {
                const reader = response.body.getReader();
                const totalSize = fileSize || parseInt(response.headers.get('Content-Length'), 10);
                let receivedLength = 0; // Received bytes
                const chunks = []; // Array of received chunks

                return new Promise((resolve, reject) => {
                    reader.read().then(function processText({ done, value }) {
                        if (done) {
                            const blob = new Blob(chunks);
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = fileName;  // Use the provided filename
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(blobUrl);  // Clean up the URL object
                            resolve();
                            return;
                        }

                        chunks.push(value);
                        receivedLength += value.length;

                        // Update progress bar
                        if (totalSize) {
                            const progress = (receivedLength / totalSize) * 100;
                            document.getElementById('progress-bar').value = progress;
                            document.getElementById('progress-text').textContent = `${formatBytes(receivedLength)} of ${formatBytes(totalSize)} downloaded (${Math.round(progress)}%)`;
                        } else {
                            // If totalSize is not available, just show progress as percentage of received length
                            document.getElementById('progress-bar').value = (receivedLength / (receivedLength + value.length)) * 100;
                            document.getElementById('progress-text').textContent = `${formatBytes(receivedLength)} downloaded`;
                        }

                        // Read the next chunk
                        return reader.read().then(processText);
                    }).catch(reject);
                });
            });
    }

    // Utility function to format bytes as a human-readable string
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
