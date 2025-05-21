const processBtn = document.getElementById('processBtn');
const folderInput = document.getElementById('folderInput');
const statusDiv = document.getElementById('status');
const downloadLink = document.getElementById('downloadLink');

// ⚠️ WARNING: Do NOT expose your real API key in production!
const apiKey = 'sk-proj-Df0-API KEY HERE';

async function generateCaption(base64Image) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this image in one sentence.",
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    }),
  });

  const data = await response.json();

  // Check and log error if the request failed
  if (!response.ok) {
    console.error("API Error:", data);
    throw new Error(data.error?.message || "Unknown API error");
  }

  return data.choices[0]?.message?.content?.trim() || "No description.";
}


function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file); // Returns full base64 data URL
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

processBtn.addEventListener('click', async () => {
  const files = Array.from(folderInput.files).filter(file =>
    file.type.startsWith("image/")
  );

  if (files.length === 0) {
    alert("Please select a folder with images.");
    return;
  }

  statusDiv.textContent = "Processing images...";
  const results = [["File Name", "Description"]];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    statusDiv.textContent = `Processing ${file.name} (${i + 1}/${files.length})`;

    try {
      const base64 = await fileToBase64(file);
      const description = await generateCaption(base64);
      results.push([file.webkitRelativePath, description]);
    } catch (err) {
      console.error("Error with file:", file.name, err);
      results.push([file.webkitRelativePath, "Error generating description GPT"]);
    }
  }

  // Convert results to CSV
  const csvContent = results.map(e => e.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  downloadLink.href = url;
  downloadLink.download = "image_descriptions.csv";
  downloadLink.style.display = "inline";
  downloadLink.textContent = "Download CSV";
  statusDiv.textContent = "Done!";
});
