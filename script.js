// Interactive Recipe Finder — improved matching & image fallback
document.addEventListener('DOMContentLoaded', () => {
  const findBtn = document.getElementById('findBtn');
  const ingredientsInput = document.getElementById('ingredients');
  const resultsContainer = document.getElementById('results');
  const minMatchSlider = document.getElementById('minMatch');
  const minValLabel = document.getElementById('minVal');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const closeModal = document.getElementById('closeModal');

  let recipes = [];

  // start with button disabled until recipes load
  findBtn.disabled = true;

  // helper: tokenize a string into single-word tokens
  const tokenize = (str) => {
    if (!str) return [];
    return String(str)
      .toLowerCase()
      .split(/[\s,\/\-\(\)]+/) // split on spaces, commas, slashes, hyphens, parentheses
      .map(s => s.trim())
      .filter(Boolean);
  };

  // load recipes.json and normalize
  fetch('recipes.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch recipes.json');
      return res.json();
    })
    .then(data => {
      // normalize each recipe (lowercase name + trim ingredients)
      recipes = data.map(r => ({
        ...r,
        nameLower: r.name ? r.name.toLowerCase() : '',
        // keep original ingredients array but ensure trimmed/lowercase when used
        ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(i => String(i).trim()) : []
      }));
      findBtn.disabled = false;
    })
    .catch(err => {
      console.error('Error loading recipes:', err);
      resultsContainer.innerHTML = '<p class="small">⚠️ Failed to load recipes. Please refresh the page.</p>';
    });

  // slider display
  minValLabel.textContent = minMatchSlider.value;
  minMatchSlider.addEventListener('input', () => {
    minValLabel.textContent = minMatchSlider.value;
  });

  // parse user input into tokens:
  // supports "tomato, pasta" and also "Tomato Pasta"
  const parseIngredients = (raw) => {
    if (!raw) return [];
    return [...new Set(tokenize(raw))]; // unique tokens
  };

  // Calculate match % by tokenizing recipe ingredients as well.
  // Also treat a recipe-name match (user typed the recipe name) as 100%.
  const calculateMatch = (recipe, userTokens, userRaw) => {
    const recipeNameLower = recipe.nameLower || '';
    if (userRaw && recipeNameLower.includes(userRaw)) {
      return 100; // direct name match (e.g. "tomato pasta")
    }

    // Build recipe token set from its ingredients (split multi-word ingredients)
    const recipeTokens = [...new Set(recipe.ingredients.flatMap(i => tokenize(i)))];

    if (recipeTokens.length === 0) return 0;

    const userSet = new Set(userTokens);
    const matches = recipeTokens.filter(t => userSet.has(t));
    const percent = (matches.length / recipeTokens.length) * 100;

    // Optionally boost small partial matches a bit (not necessary; commented)
    // return Math.min(100, percent + matches.length * 5);

    return percent;
  };

  // Render cards
  const renderResults = (filteredRecipes) => {
    resultsContainer.innerHTML = '';

    if (!filteredRecipes || filteredRecipes.length === 0) {
      resultsContainer.innerHTML = '<p class="small">❌ No recipes found. Try adding more ingredients or lowering the match percentage.</p>';
      return;
    }

    filteredRecipes.forEach(r => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.innerHTML = `
        <img src="${r.image}" alt="${r.name}" onerror="this.src='images/no-image.png';" />
        <h3>${r.name}</h3>
        <p class="small">Match: ${Math.round(r.match)}%</p>
      `;
      card.addEventListener('click', () => openModal(r));
      resultsContainer.appendChild(card);
    });
  };

  // Modal details
  const openModal = (recipe) => {
    modalBody.innerHTML = `
      <h2>${recipe.name}</h2>
      <img src="${recipe.image}" alt="${recipe.name}" style="width:100%; border-radius:8px;" onerror="this.src='images/no-image.png';" />
      <h4>Ingredients:</h4>
      <ul>${(recipe.ingredients || []).map(i => `<li>${i}</li>`).join('')}</ul>
      <h4>Steps:</h4>
      <ol>${(recipe.steps || []).map(s => `<li>${s}</li>`).join('')}</ol>
    `;
    modal.setAttribute('aria-hidden', 'false');
  };

  closeModal.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.setAttribute('aria-hidden', 'true'); });

  // Main search handler
  findBtn.addEventListener('click', () => {
    const raw = (ingredientsInput.value || '').trim().toLowerCase();
    const userTokens = parseIngredients(raw);
    const minMatch = Number(minMatchSlider.value || 0);

    if (userTokens.length === 0) {
      resultsContainer.innerHTML = '<p class="small">⚠️ Please enter at least one ingredient or recipe name.</p>';
      return;
    }

    // compute match for each recipe, then filter & sort
    const results = recipes.map(r => {
      const match = calculateMatch(r, userTokens, raw);
      return { ...r, match };
    }).filter(r => r.match >= minMatch)
      .sort((a, b) => b.match - a.match);

    renderResults(results);
  });
});
