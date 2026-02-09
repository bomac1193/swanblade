/**
 * Procedural Recipes API
 *
 * CRUD operations for procedural audio recipes:
 * - GET: List all recipes or get a specific recipe
 * - POST: Create a new recipe or generate from preset
 * - PUT: Update an existing recipe
 * - DELETE: Delete a recipe
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ProceduralRecipe,
  RecipeCategory,
  RECIPE_PRESETS,
  createEmptyRecipe,
  createRecipeFromPreset,
  validateRecipe,
} from "@/lib/proceduralRecipe";
import { compileRecipe, CompilerTarget } from "@/lib/recipeCompiler";

// In-memory storage (in production, use a database)
const recipeStore = new Map<string, ProceduralRecipe>();

// Initialize with presets as templates
RECIPE_PRESETS.forEach((preset, index) => {
  const recipe = createRecipeFromPreset(index);
  recipeStore.set(recipe.id, recipe);
});

// ==================== GET ====================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const category = searchParams.get("category") as RecipeCategory | null;
  const search = searchParams.get("search");
  const compile = searchParams.get("compile") as CompilerTarget | null;

  // Get single recipe by ID
  if (id) {
    const recipe = recipeStore.get(id);
    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Optionally compile the recipe
    if (compile) {
      try {
        const compiled = compileRecipe(recipe, compile);
        return NextResponse.json({ recipe, compiled });
      } catch (error) {
        return NextResponse.json(
          { error: `Compilation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ recipe });
  }

  // Get all recipes with optional filtering
  let recipes = Array.from(recipeStore.values());

  // Filter by category
  if (category) {
    recipes = recipes.filter((r) => r.category === category);
  }

  // Search by name, description, or tags
  if (search) {
    const lowerSearch = search.toLowerCase();
    recipes = recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerSearch) ||
        r.description.toLowerCase().includes(lowerSearch) ||
        r.tags.some((t) => t.toLowerCase().includes(lowerSearch))
    );
  }

  // Sort by updated date
  recipes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({
    recipes,
    total: recipes.length,
    presets: RECIPE_PRESETS.map((p, i) => ({
      index: i,
      name: p.name,
      category: p.category,
      description: p.description,
    })),
  });
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, presetIndex, name, category, recipe: inputRecipe } = body;

    // Create from preset
    if (action === "from_preset" && presetIndex !== undefined) {
      const recipe = createRecipeFromPreset(presetIndex, name);
      recipeStore.set(recipe.id, recipe);
      return NextResponse.json({ recipe, created: true });
    }

    // Create empty recipe
    if (action === "create_empty") {
      if (!name || !category) {
        return NextResponse.json(
          { error: "name and category are required" },
          { status: 400 }
        );
      }
      const recipe = createEmptyRecipe(name, category);
      recipeStore.set(recipe.id, recipe);
      return NextResponse.json({ recipe, created: true });
    }

    // Import full recipe
    if (action === "import" && inputRecipe) {
      // Validate the recipe
      const validation = validateRecipe(inputRecipe);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid recipe", errors: validation.errors },
          { status: 400 }
        );
      }

      // Assign new ID if needed
      const recipe: ProceduralRecipe = {
        ...inputRecipe,
        id: inputRecipe.id || `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: inputRecipe.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      recipeStore.set(recipe.id, recipe);
      return NextResponse.json({
        recipe,
        imported: true,
        warnings: validation.warnings,
      });
    }

    // Compile recipe
    if (action === "compile") {
      const { recipeId, target } = body;
      if (!recipeId || !target) {
        return NextResponse.json(
          { error: "recipeId and target are required" },
          { status: 400 }
        );
      }

      const recipe = recipeStore.get(recipeId);
      if (!recipe) {
        return NextResponse.json(
          { error: "Recipe not found" },
          { status: 404 }
        );
      }

      const compiled = compileRecipe(recipe, target);
      return NextResponse.json({ compiled });
    }

    // Validate recipe
    if (action === "validate") {
      const { recipe: recipeToValidate } = body;
      if (!recipeToValidate) {
        return NextResponse.json(
          { error: "recipe is required" },
          { status: 400 }
        );
      }

      const validation = validateRecipe(recipeToValidate);
      return NextResponse.json({ validation });
    }

    // Duplicate recipe
    if (action === "duplicate") {
      const { recipeId, newName } = body;
      if (!recipeId) {
        return NextResponse.json(
          { error: "recipeId is required" },
          { status: 400 }
        );
      }

      const original = recipeStore.get(recipeId);
      if (!original) {
        return NextResponse.json(
          { error: "Recipe not found" },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const duplicate: ProceduralRecipe = {
        ...original,
        id: `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: newName || `${original.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };

      recipeStore.set(duplicate.id, duplicate);
      return NextResponse.json({ recipe: duplicate, duplicated: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: from_preset, create_empty, import, compile, validate, duplicate" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Recipe API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ==================== PUT ====================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const existing = recipeStore.get(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Apply updates
    const updated: ProceduralRecipe = {
      ...existing,
      ...updates,
      id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    // Validate
    const validation = validateRecipe(updated);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid updates", errors: validation.errors },
        { status: 400 }
      );
    }

    recipeStore.set(id, updated);
    return NextResponse.json({
      recipe: updated,
      updated: true,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error("Recipe update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ==================== DELETE ====================

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  const existing = recipeStore.get(id);
  if (!existing) {
    return NextResponse.json(
      { error: "Recipe not found" },
      { status: 404 }
    );
  }

  recipeStore.delete(id);
  return NextResponse.json({
    deleted: true,
    id,
    name: existing.name,
  });
}
