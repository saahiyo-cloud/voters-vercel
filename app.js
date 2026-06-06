document.addEventListener('DOMContentLoaded', () => {
  // State Mapping for Search Autocomplete
  const stateMap = {
    "andhra pradesh": "S01",
    "arunachal pradesh": "S02",
    "assam": "S03",
    "bihar": "S04",
    "goa": "S05",
    "gujarat": "S06",
    "haryana": "S07",
    "himachal pradesh": "S08",
    "jammu and kashmir": "U08",
    "karnataka": "S10",
    "kerala": "S11",
    "madhya pradesh": "S12",
    "maharashtra": "S13",
    "manipur": "S14",
    "meghalaya": "S15",
    "mizoram": "S16",
    "nagaland": "S17",
    "odisha": "S18",
    "punjab": "S19",
    "rajasthan": "S20",
    "sikkim": "S21",
    "tamil nadu": "S22",
    "tripura": "S23",
    "uttar pradesh": "S24",
    "west bengal": "S25",
    "chhattisgarh": "S26",
    "jharkhand": "S27",
    "uttarakhand": "S28",
    "telangana": "S29",
    "andaman and nicobar islands": "U01",
    "chandigarh": "U02",
    "dadra and nagar haveli and daman and diu": "U03",
    "delhi (nct)": "U05",
    "lakshadweep": "U06",
    "puducherry": "U07",
    "ladakh": "U09"
  };

  // Elements
  const form = document.getElementById('voter-search-form');
  const captchaImg = document.getElementById('captcha-img');
  const captchaLoader = document.getElementById('captcha-loader');
  const refreshCaptchaBtn = document.getElementById('refresh-captcha');
  const captchaIdInput = document.getElementById('captcha-id');
  const captchaInput = document.getElementById('captcha-input');
  
  const searchBtn = document.getElementById('search-btn');
  const btnText = searchBtn.querySelector('.btn-text');
  const btnSpinner = searchBtn.querySelector('.btn-spinner');
  
  const errorMessage = document.getElementById('error-message');
  const noResultsMessage = document.getElementById('no-results-message');
  const resultsPanel = document.getElementById('results-panel');
  const printBtn = document.getElementById('print-btn');
  
  // Result Info Elements
  const resName = document.getElementById('res-name');
  const resNameLang = document.getElementById('res-name-lang');
  const resRelation = document.getElementById('res-relation');
  const resRelationType = document.getElementById('res-relation-type');
  const resAgeGender = document.getElementById('res-age-gender');
  const resEpic = document.getElementById('res-epic');
  const resState = document.getElementById('res-state');
  const resAssembly = document.getElementById('res-assembly');
  const resParliament = document.getElementById('res-parliament');
  const resPart = document.getElementById('res-part');
  const resSerial = document.getElementById('res-serial');
  const resPollingStation = document.getElementById('res-polling-station');
  const resRoomDetails = document.getElementById('res-room-details');
  const resBuildingAddress = document.getElementById('res-building-address');
  const mapContainer = document.getElementById('map-container');
  const mapLink = document.getElementById('map-link');

  // Load CAPTCHA on startup
  loadCaptcha();

  // Refresh button click
  refreshCaptchaBtn.addEventListener('click', loadCaptcha);

  // Print button click
  printBtn.addEventListener('click', () => {
    window.print();
  });

  // Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset state
    hideAlerts();
    resultsPanel.classList.add('hidden');

    const stateInput = document.getElementById('state-search').value.trim().toLowerCase();
    let stateCd = stateMap[stateInput];

    if (!stateCd) {
      // Check if it's already a code like S06 or U05
      const upperInput = stateInput.toUpperCase();
      if (upperInput.length === 3 && (upperInput.startsWith('S') || upperInput.startsWith('U')) && !isNaN(upperInput.slice(1))) {
        stateCd = upperInput;
      }
    }

    if (!stateCd) {
      errorMessage.querySelector('.alert-text').textContent = 'Please choose a valid state from the list.';
      errorMessage.classList.remove('hidden');
      errorMessage.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    setLoadingState(true);

    const formData = {
      epicNumber: document.getElementById('epic-number').value.trim().toUpperCase(),
      stateCd: stateCd,
      captchaId: captchaIdInput.value,
      captchaData: captchaInput.value.trim()
    };

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to perform search. Please try again.');
      }

      if (Array.isArray(data) && data.length > 0) {
        displayResults(data[0]);
      } else {
        noResultsMessage.classList.remove('hidden');
        noResultsMessage.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error(err);
      errorMessage.querySelector('.alert-text').textContent = err.message || 'An unexpected server error occurred.';
      errorMessage.classList.remove('hidden');
      errorMessage.scrollIntoView({ behavior: 'smooth' });
    } finally {
      setLoadingState(false);
      // CAPTCHA is consumed by search request, so load a new one
      captchaInput.value = '';
      loadCaptcha();
    }
  });

  // Fetch Captcha
  async function loadCaptcha() {
    captchaImg.classList.add('hidden');
    captchaLoader.classList.remove('hidden');
    refreshCaptchaBtn.setAttribute('disabled', 'true');

    try {
      const res = await fetch('/api/captcha');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Could not fetch captcha.');
      }

      if (data.status === 'success' && data.captcha_image) {
        let captchaSrc = data.captcha_image;
        if (!captchaSrc.startsWith('data:image')) {
          captchaSrc = `data:image/png;base64,${captchaSrc}`;
        }
        captchaImg.src = captchaSrc;
        captchaIdInput.value = data.captcha_id;
        
        // Auto-fill solved CAPTCHA text if returned
        if (data.auto_solve) {
          captchaInput.value = data.auto_solve;
        } else {
          captchaInput.value = '';
        }
        
        // Wait for image load to display cleanly
        captchaImg.onload = () => {
          captchaLoader.classList.add('hidden');
          captchaImg.classList.remove('hidden');
        };
      } else {
        throw new Error('Invalid captcha format.');
      }
    } catch (err) {
      console.error(err);
      // If captcha load fails, show error in the alert area
      errorMessage.querySelector('.alert-text').textContent = 'Error loading CAPTCHA. ECI portal might be busy. Please refresh.';
      errorMessage.classList.remove('hidden');
    } finally {
      refreshCaptchaBtn.removeAttribute('disabled');
    }
  }

  // Display Voter Information
  function displayResults(resultItem) {
    const voter = resultItem.content || {};

    // Helper to join first/last names
    const getFullName = (first, last) => {
      const f = first ? first.trim() : '';
      const l = last ? last.trim() : '';
      return `${f} ${l}`.trim() || '-';
    };

    // Helper to format relation type
    const getRelationType = (type) => {
      const types = {
        'FTHR': 'Father',
        'MTHR': 'Mother',
        'HUSB': 'Husband',
        'OTHR': 'Other'
      };
      return types[type] || type || '-';
    };

    // Populate Fields
    resName.textContent = getFullName(voter.applicantFirstName, voter.applicantLastName);
    
    const regionalName = getFullName(voter.applicantFirstNameL1, voter.applicantLastNameL1);
    resNameLang.textContent = regionalName !== '-' ? regionalName : '-';
    
    resRelation.textContent = getFullName(voter.relationName, voter.relationLName);
    resRelationType.textContent = getRelationType(voter.relationType);
    
    const age = voter.age || '-';
    const gender = voter.gender === 'M' ? 'Male' : (voter.gender === 'F' ? 'Female' : voter.gender || '-');
    resAgeGender.textContent = `${age} / ${gender}`;
    
    resEpic.textContent = voter.epicNumber || '-';
    resState.textContent = voter.stateName || '-';
    
    const acNum = voter.acNumber ? `${voter.acNumber} - ` : '';
    const acName = voter.asmblyName || '';
    resAssembly.textContent = `${acNum}${acName}` || '-';
    
    const pcNum = voter.prlmntNo ? `${voter.prlmntNo} - ` : '';
    const pcName = voter.prlmntName || '';
    resParliament.textContent = `${pcNum}${pcName}` || '-';
    
    const partNum = voter.partNumber ? `#${voter.partNumber} - ` : '';
    const partName = voter.partName || '';
    resPart.textContent = `${partNum}${partName}` || '-';
    
    resSerial.textContent = voter.partSerialNumber || '-';
    resPollingStation.textContent = voter.psbuildingName || voter.psBuildingNameL1 || '-';
    resRoomDetails.textContent = voter.psRoomDetails || voter.psRoomDetailsL1 || '-';
    resBuildingAddress.textContent = voter.buildingAddress || voter.buildingAddressL1 || '-';

    // Map Coordinates Handling
    const mapsLink = getGoogleMapsLink(voter.partLatLong);
    if (mapsLink) {
      mapLink.href = mapsLink;
      mapContainer.classList.remove('hidden');
    } else {
      mapContainer.classList.add('hidden');
    }

    // Show Results
    resultsPanel.classList.remove('hidden');
    resultsPanel.scrollIntoView({ behavior: 'smooth' });
  }

  // Parse GPS coordinates to google maps URL
  function getGoogleMapsLink(partLatLong) {
    if (!partLatLong) return null;
    const regex = /(-?\d+\.\d+)/g;
    const matches = partLatLong.match(regex);
    if (matches && matches.length >= 2) {
      return `https://www.google.com/maps/search/?api=1&query=${matches[0]},${matches[1]}`;
    }
    return null;
  }

  function hideAlerts() {
    errorMessage.classList.add('hidden');
    noResultsMessage.classList.add('hidden');
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      searchBtn.setAttribute('disabled', 'true');
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');
    } else {
      searchBtn.removeAttribute('disabled');
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }

  // Auto-fill state from EPIC number prefix
  const epicInput = document.getElementById('epic-number');
  const stateSearchInput = document.getElementById('state-search');

  epicInput.addEventListener('input', () => {
    const epicVal = epicInput.value.trim().toUpperCase();
    if (epicVal.length >= 2) {
      const detectedState = autoDetectStateFromEpic(epicVal);
      if (detectedState) {
        stateSearchInput.value = detectedState;
      }
    }
  });

  function autoDetectStateFromEpic(epic) {
    // Map of prefixes to state names
    const prefixMap = {
      'ZNO': 'Gujarat',
      'GJ': 'Gujarat',
      'WB': 'West Bengal',
      'UP': 'Uttar Pradesh',
      'DL': 'Delhi (NCT)',
      'MH': 'Maharashtra',
      'HR': 'Haryana',
      'KA': 'Karnataka',
      'KL': 'Kerala',
      'AP': 'Andhra Pradesh',
      'BR': 'Bihar',
      'CG': 'Chhattisgarh',
      'CH': 'Chandigarh',
      'JH': 'Jharkhand',
      'MP': 'Madhya Pradesh',
      'RJ': 'Rajasthan',
      'TN': 'Tamil Nadu',
      'TS': 'Telangana',
      'TG': 'Telangana',
      'UT': 'Uttarakhand',
      'UA': 'Uttarakhand',
      'PB': 'Punjab',
      'HP': 'Himachal Pradesh',
      'JK': 'Jammu and Kashmir',
      'AS': 'Assam',
      'ML': 'Meghalaya',
      'MN': 'Manipur',
      'MZ': 'Mizoram',
      'NL': 'Nagaland',
      'SK': 'Sikkim',
      'TR': 'Tripura',
      'AR': 'Arunachal Pradesh',
      'GA': 'Goa',
      'PY': 'Puducherry',
      'AN': 'Andaman and Nicobar Islands',
      'LD': 'Lakshadweep',
      'DN': 'Dadra and Nagar Haveli and Daman and Diu',
      'DD': 'Dadra and Nagar Haveli and Daman and Diu',
      'LA': 'Ladakh'
    };

    // Try matching 3-letter prefix
    if (epic.length >= 3) {
      const slice3 = epic.slice(0, 3);
      if (prefixMap[slice3]) return prefixMap[slice3];
    }

    // Try matching 2-letter prefix
    const slice2 = epic.slice(0, 2);
    if (prefixMap[slice2]) return prefixMap[slice2];

    return null;
  }
});
