const processBtn = document.getElementById('processBtn');
const folderInput = document.getElementById('folderInput');
const statusDiv = document.getElementById('status');
const downloadLink = document.getElementById('downloadLink');

// 🔐 Replace with your Replicate API token
const replicateApiToken = 'r8_8ouZzccS5WMcVWPqBQsGwew0NV3vQIX2Nh51R';

// Helper to read image as base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

// Helper to upload image to Replicate (via free hosting)
async function uploadToImgBB(base64Image) {
  const formData = new FormData();
  formData.append('image', base64Image.split(',')[1]);

  const response = await fetch('https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.data.url;
}

// Call Replicate API to get caption
async function generateCaption(imageUrl) {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${replicateApiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: "db21e45c-4c0e-4d86-89f2-0c6fdd720d4a", // Salesforce BLIP version
      input: {
        image: imageUrl
      }
    })
  });

  const prediction = await response.json();

  // Polling until status is 'succeeded'
  let result;
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 sec
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${replicateApiToken}` }
    });
    result = await poll.json();
    prediction.status = result.status;
  }

  if (prediction.status === "succeeded") {
    return result.output;
  } else {
    return "Failed to generate description";
  }
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
    statusDiv.textContent = `Uploading ${file.name} (${i + 1}/${files.length})`;

    const base64 = await fileToBase64(file);
    try {
      const imageUrl = await uploadToImgBB(base64);
      statusDiv.textContent = `Captioning ${file.name}`;
      const description = await generateCaption(imageUrl);
      results.push([file.webkitRelativePath, description]);
    } catch (err) {
      results.push([file.webkitRelativePath, "Error generating description"]);
    }
  }

  // Convert to CSV and offer download
  const csvContent = results.map(e => e.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  downloadLink.href = url;
  downloadLink.download = "image_descriptions.csv";
  downloadLink.style.display = "inline";
  downloadLink.textContent = "Download CSV";
  statusDiv.textContent = "Done!";
});
