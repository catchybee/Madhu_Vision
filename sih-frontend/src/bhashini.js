const cache = {};

export const getCachedText = (text, lang) => {
  if (lang === 'en' || !text) return text;
  return cache[`${lang}_${text}`] || null;
};

export const translateText = async (textArray, targetLang) => {
  if (targetLang === 'en' || !textArray || textArray.length === 0) {
    return textArray;
  }

  const results = [];
  const toTranslate = [];
  const indices = [];

  // Check cache first
  textArray.forEach((text, i) => {
    const cached = getCachedText(text, targetLang);
    if (cached) {
      results[i] = cached;
    } else {
      toTranslate.push(text);
      indices.push(i);
    }
  });

  // If everything was cached, return immediately
  if (toTranslate.length === 0) {
    return results;
  }

  const url = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
  const apiKey = 'nsKvSttYi84d-mDubcmvHclcj66Htf5bRs3HMJZkW4qEqZyi6w-6y01OZFnudwzP';

  const payload = {
    pipelineTasks: [
      {
        taskType: 'translation',
        config: {
          language: {
            sourceLanguage: 'en',
            targetLanguage: targetLang
          },
          serviceId: 'ai4bharat/indictrans-v2-all-gpu--t4'
        }
      }
    ],
    inputData: {
      input: toTranslate.map(text => ({ source: text }))
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.pipelineResponse && data.pipelineResponse[0] && data.pipelineResponse[0].output) {
      data.pipelineResponse[0].output.forEach((item, idx) => {
        const originalIdx = indices[idx];
        const translatedText = item.target;
        results[originalIdx] = translatedText;
        // Save to cache
        cache[`${targetLang}_${toTranslate[idx]}`] = translatedText;
      });
      return results;
    }
    
    // Fallback if API response is missing output
    indices.forEach(idx => results[idx] = textArray[idx]);
    return results;
  } catch (error) {
    console.error('Bhashini Translation Error:', error);
    // Fallback on error
    indices.forEach(idx => results[idx] = textArray[idx]);
    return results;
  }
};
