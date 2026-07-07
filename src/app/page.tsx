"use client";

import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  Activity,
  Banknote,
  Bot,
  CalendarDays,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  Crown,
  Database,
  Gamepad2,
  LayoutDashboard,
  MapPin,
  PiggyBank,
  Plane,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import styles from "./page.module.css";

type CategorySubItem = {
  id: string;
  name: string;
  percent: number;
};

type Category = {
  id: string;
  name: string;
  percent: number;
  destination: string;
  subItems?: CategorySubItem[];
};

type Obligation = {
  id: string;
  name: string;
  amount: number;
  destination: string;
  kind: "fixed" | "debt";
  startMonth: string;
  totalMonths: number;
};

type Trip = {
  id: string;
  whereTo: string;
  purpose: string;
  budget: number;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  color?: string;
};

type PurchaseGoal = {
  id: string;
  item: string;
  price: number;
  availableFund: number;
  monthlyContribution: number;
};

type MealPlan = {
  id: string;
  date: string;
  meal: "brunch" | "dinner";
  food: string;
  notes: string;
};

type MealCatalogItem = {
  id: string;
  name: string;
  notes: string;
};

type LifeOSState = {
  stash: number;
  buyingPowerPercent: number;
  categories: Category[];
  obligations: Obligation[];
  trips: Trip[];
  purchaseGoals: PurchaseGoal[];
  meals: MealPlan[];
  mealCatalog: MealCatalogItem[];
};

type ActiveTab = "overview" | "budget" | "travel" | "food";
type BudgetTab = "allocations" | "obligations" | "buy-list";
type PhilMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
type SyncState = {
  status: "Local only" | "Sign in" | "Connecting" | "Synced" | "Saving" | "Check email" | "Setup needed" | "Error";
  detail: string;
};
type AuthMode = "sign-in" | "sign-up";

const defaultState: LifeOSState = {
  stash: 250000,
  buyingPowerPercent: 25,
  categories: [
    { id: "wealth", name: "Wealth Building", percent: 35, destination: "Brokerage / Investments" },
    { id: "protection", name: "Protection", percent: 15, destination: "Emergency Fund" },
    { id: "experiences", name: "Experiences", percent: 15, destination: "Travel Wallet" },
    { id: "big-goals", name: "Big Goals", percent: 15, destination: "High-Yield Savings" },
    { id: "monthly", name: "Monthly Obligations", percent: 15, destination: "Bills Account" },
    { id: "spending", name: "Guilt-Free Spending", percent: 5, destination: "Spending App" },
  ],
  obligations: [
    {
      id: "rent",
      name: "Rent",
      amount: 28000,
      destination: "Landlord / Bank Transfer",
      kind: "fixed",
      startMonth: monthInputValue(new Date()),
      totalMonths: 0,
    },
    {
      id: "debt",
      name: "Debt Payment",
      amount: 12000,
      destination: "Credit Card",
      kind: "debt",
      startMonth: monthInputValue(new Date()),
      totalMonths: 11,
    },
    {
      id: "groceries",
      name: "Groceries",
      amount: 14000,
      destination: "Debit Card",
      kind: "fixed",
      startMonth: monthInputValue(new Date()),
      totalMonths: 0,
    },
  ],
  trips: [
    {
      id: "manila",
      whereTo: "Manila",
      purpose: "Reset weekend",
      budget: 18000,
      startDate: "2026-08-04",
      endDate: "2026-08-07",
      imageUrl:
        "https://images.unsplash.com/photo-1573790387438-4da905039392?auto=format&fit=crop&w=900&q=80",
      color: "#0ea5e9",
    },
  ],
  purchaseGoals: [
    {
      id: "steam-deck",
      item: "Steam Deck",
      price: 35000,
      availableFund: 8000,
      monthlyContribution: 1200,
    },
  ],
  meals: [
    {
      id: "meal-demo-brunch",
      date: dateInputValue(new Date()),
      meal: "brunch",
      food: "Eggs, rice, and coffee",
      notes: "Simple trading-day brunch.",
    },
    {
      id: "meal-demo-dinner",
      date: dateInputValue(new Date()),
      meal: "dinner",
      food: "Chicken adobo",
      notes: "Cook extra for leftovers.",
    },
  ],
  mealCatalog: [
    { id: "catalog-adobo", name: "Chicken adobo", notes: "Good dinner, cook extra for leftovers." },
    { id: "catalog-eggs-rice", name: "Eggs, rice, and coffee", notes: "Fast brunch for busy trading days." },
    { id: "catalog-tuna-pasta", name: "Tuna pasta", notes: "Easy pantry meal." },
  ],
};

const storageKey = "lifeos-state";
let cachedStorageText: string | null = null;
let cachedStorageState: LifeOSState = defaultState;

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const categoryColors = ["#2dd4bf", "#fb7185", "#facc15", "#60a5fa", "#a78bfa", "#34d399"];
const tripColors = ["#0ea5e9", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#14b8a6", "#eab308"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthDiff(startMonth: string, endDate = new Date()) {
  const [year, month] = startMonth.split("-").map(Number);
  return Math.max(0, (endDate.getFullYear() - year) * 12 + endDate.getMonth() - (month - 1));
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function compareDateStrings(a: string, b: string) {
  return parseLocalDate(a).getTime() - parseLocalDate(b).getTime();
}

function isBetween(day: string, start: string, end: string) {
  return compareDateStrings(day, start) >= 0 && compareDateStrings(day, end) <= 0;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function normalizeLifeOSState(state: Partial<LifeOSState>): LifeOSState {
  return {
    ...defaultState,
    ...state,
    categories: state.categories ?? defaultState.categories,
    obligations: state.obligations ?? defaultState.obligations,
    trips: state.trips ?? defaultState.trips,
    purchaseGoals: state.purchaseGoals ?? defaultState.purchaseGoals,
    meals: state.meals ?? defaultState.meals,
    mealCatalog: state.mealCatalog ?? defaultState.mealCatalog,
  };
}

function readLifeOSState() {
  if (typeof window === "undefined") {
    return defaultState;
  }

  const saved = window.localStorage.getItem(storageKey);

  if (!saved) {
    cachedStorageText = null;
    cachedStorageState = defaultState;
    return defaultState;
  }

  if (saved === cachedStorageText) {
    return cachedStorageState;
  }

  try {
    cachedStorageText = saved;
    cachedStorageState = normalizeLifeOSState(JSON.parse(saved) as Partial<LifeOSState>);
    return cachedStorageState;
  } catch {
    cachedStorageText = null;
    cachedStorageState = defaultState;
    return defaultState;
  }
}

function subscribeToLifeOSState(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("lifeos-state-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("lifeos-state-change", onStoreChange);
  };
}

function writeLifeOSState(nextState: LifeOSState) {
  const nextText = JSON.stringify(nextState);
  cachedStorageText = nextText;
  cachedStorageState = nextState;
  window.localStorage.setItem(storageKey, nextText);
  window.dispatchEvent(new Event("lifeos-state-change"));
}

function syncStateFromDetail(status: SyncState["status"], detail: string): SyncState {
  return { status, detail };
}

function getSupabaseSyncError(error: unknown): SyncState {
  const message = error instanceof Error ? error.message : "Supabase sync failed";

  if (message.toLowerCase().includes("lifeos_states")) {
    return syncStateFromDetail("Setup needed", "Run supabase/schema.sql in the Supabase SQL editor.");
  }

  return syncStateFromDetail("Error", message);
}

export default function Home() {
  const state = useSyncExternalStore(subscribeToLifeOSState, readLifeOSState, () => defaultState);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [activeBudgetTab, setActiveBudgetTab] = useState<BudgetTab>("allocations");
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>("wealth");
  const [syncState, setSyncState] = useState<SyncState>(() =>
    syncStateFromDetail("Local only", "Add Supabase env vars to enable cloud sync"),
  );
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const cloudUserIdRef = useRef<string | null>(null);
  const cloudReadyRef = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const [activeMonth, setActiveMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [foodMonth, setFoodMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedMealSlot, setSelectedMealSlot] = useState<{
    date: string;
    meal: MealPlan["meal"];
  } | null>(null);
  const [mealDraft, setMealDraft] = useState({ food: "", notes: "" });
  const [mealSearch, setMealSearch] = useState("");
  const [mealLibraryDraft, setMealLibraryDraft] = useState({ name: "", notes: "" });
  const [philOpen, setPhilOpen] = useState(false);
  const [philPosition, setPhilPosition] = useState({ x: 0, y: 0 });
  const [philInput, setPhilInput] = useState("");
  const [philLoading, setPhilLoading] = useState(false);
  const philDraggedRef = useRef(false);
  const [philMessages, setPhilMessages] = useState<PhilMessage[]>([
    {
      id: "phil-welcome",
      role: "assistant",
      content: "I am Phil, your LifeOS advisor. Ask me anything about your stash, bills, trips, food, or buy list.",
    },
  ]);
  const [draftTrip, setDraftTrip] = useState({
    whereTo: "Manila",
    purpose: "Focused getaway",
    budget: 18000,
    startDate: "2026-08-04",
    endDate: "2026-08-07",
    imageUrl:
      "https://images.unsplash.com/photo-1573790387438-4da905039392?auto=format&fit=crop&w=900&q=80",
  });
  const [selectingRange, setSelectingRange] = useState<"start" | "end">("start");

  function setState(updater: LifeOSState | ((current: LifeOSState) => LifeOSState)) {
    const current = readLifeOSState();
    writeLifeOSState(typeof updater === "function" ? updater(current) : updater);
  }

  async function loadCloudState(userId: string) {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const { data: remoteState, error: readError } = await supabase
      .from("lifeos_states")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (remoteState?.data) {
      writeLifeOSState(normalizeLifeOSState(remoteState.data as Partial<LifeOSState>));
      return;
    }

    const { error: insertError } = await supabase.from("lifeos_states").upsert(
      {
        user_id: userId,
        data: readLifeOSState(),
      },
      { onConflict: "user_id" },
    );

    if (insertError) {
      throw insertError;
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setSyncState(syncStateFromDetail("Local only", "Add Supabase env vars to enable cloud sync"));
      return;
    }

    try {
      setAuthLoading(true);
      setSyncState(syncStateFromDetail("Connecting", "Signing in to Supabase"));

      const response =
        authMode === "sign-in"
          ? await supabase.auth.signInWithPassword({
              email: authEmail,
              password: authPassword,
            })
          : await supabase.auth.signUp({
              email: authEmail,
              password: authPassword,
            });

      if (response.error) {
        throw response.error;
      }

      if (!response.data.user || !response.data.session) {
        setSyncState(syncStateFromDetail("Check email", "Confirm your email, then sign in."));
        return;
      }

      cloudUserIdRef.current = response.data.user.id;
      setUserEmail(response.data.user.email ?? authEmail);
      await loadCloudState(response.data.user.id);
      cloudReadyRef.current = true;
      setAuthPassword("");
      setSyncState(syncStateFromDetail("Synced", "Supabase cloud sync is active"));
    } catch (error) {
      cloudReadyRef.current = false;
      setSyncState(getSupabaseSyncError(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    cloudReadyRef.current = false;
    cloudUserIdRef.current = null;
    setUserEmail(null);
    setSyncState(syncStateFromDetail("Sign in", "Sign in to sync LifeOS with Supabase"));
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPhilPosition({
        x: Math.max(window.innerWidth - 118, 18),
        y: Math.max(window.innerHeight - 118, 18),
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function updateScrolledState() {
      setIsScrolled(window.scrollY > 90);
    }

    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const supabaseClient = supabase;

    async function connectToCloud() {
      try {
        await Promise.resolve();

        if (cancelled) {
          return;
        }

        setSyncState(syncStateFromDetail("Connecting", "Connecting to Supabase"));

        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const user = sessionData.session?.user ?? null;

        if (!user) {
          cloudReadyRef.current = false;
          cloudUserIdRef.current = null;
          setUserEmail(null);
          setSyncState(syncStateFromDetail("Sign in", "Sign in to sync LifeOS with Supabase"));
          return;
        }

        cloudUserIdRef.current = user.id;
        setUserEmail(user.email ?? "Signed in");
        await loadCloudState(user.id);

        cloudReadyRef.current = true;

        if (!cancelled) {
          setSyncState(syncStateFromDetail("Synced", "Supabase cloud sync is active"));
        }
      } catch (error) {
        cloudReadyRef.current = false;

        if (!cancelled) {
          setSyncState(getSupabaseSyncError(error));
        }
      }
    }

    connectToCloud();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const userId = cloudUserIdRef.current;

    if (!supabase || !userId || !cloudReadyRef.current) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setSyncState(syncStateFromDetail("Saving", "Saving LifeOS to Supabase"));

      const { error } = await supabase.from("lifeos_states").upsert(
        {
          user_id: userId,
          data: state,
        },
        { onConflict: "user_id" },
      );

      setSyncState(
        error
          ? getSupabaseSyncError(error)
          : syncStateFromDetail("Synced", "Supabase cloud sync is active"),
      );
    }, 900);

    return () => window.clearTimeout(timer);
  }, [state]);

  const buyingPower = state.stash * (state.buyingPowerPercent / 100);
  const categoryTotal = state.categories.reduce((sum, category) => sum + category.percent, 0);
  const monthlyCategory = state.categories.find((category) => category.id === "monthly");
  const monthlyEnvelope = buyingPower * ((monthlyCategory?.percent ?? 0) / 100);

  const monthlyDue = state.obligations.reduce((sum, obligation) => {
    const remaining = remainingMonths(obligation);
    return sum + (obligation.kind === "fixed" || remaining > 0 ? obligation.amount : 0);
  }, 0);
  const protectedCash = state.stash - buyingPower;
  const monthlyRemaining = monthlyEnvelope - monthlyDue;
  const protectedRatio = protectedCash / Math.max(state.stash, 1);
  const runwayRatio =
    monthlyEnvelope > 0
      ? Math.max(-1, Math.min(monthlyRemaining / monthlyEnvelope, 1))
      : monthlyRemaining >= 0
        ? 1
        : -1;
  const powerScore = Math.round(
    Math.min(state.stash / 250000, 1) * 30 +
      Math.max(0, Math.min(protectedRatio, 1)) * 35 +
      Math.max(0, (runwayRatio + 1) / 2) * 35,
  );
  const powerLevels = [
    { min: 0, name: "Spark", tone: "Cautious" },
    { min: 25, name: "Steady", tone: "Building" },
    { min: 45, name: "Builder", tone: "Stable" },
    { min: 65, name: "Flex", tone: "Ready" },
    { min: 82, name: "Boss", tone: "Premium" },
  ];
  const powerLevelIndex = powerLevels.findLastIndex((level) => powerScore >= level.min);
  const powerLevel = powerLevels[Math.max(powerLevelIndex, 0)];
  const nextPowerLevel = powerLevels[Math.min(powerLevelIndex + 1, powerLevels.length - 1)];
  const powerLevelProgress =
    powerLevel.name === nextPowerLevel.name
      ? 100
      : Math.round(((powerScore - powerLevel.min) / (nextPowerLevel.min - powerLevel.min)) * 100);
  const fixedObligations = state.obligations
    .filter((obligation) => obligation.kind === "fixed")
    .reduce((sum, obligation) => sum + obligation.amount, 0);
  const debtObligations = state.obligations
    .filter((obligation) => obligation.kind === "debt" && remainingMonths(obligation) > 0)
    .reduce((sum, obligation) => sum + obligation.amount, 0);
  const fixedObligationItems = state.obligations.filter((obligation) => obligation.kind === "fixed");
  const debtObligationItems = state.obligations.filter((obligation) => obligation.kind === "debt");
  const tripBudgetTotal = state.trips.reduce((sum, trip) => sum + trip.budget, 0);
  const allocationGradient = state.categories
    .reduce(
      (segments, category, index) => {
        const start = segments.cursor;
        const end = start + (category.percent / Math.max(categoryTotal, 1)) * 100;
        return {
          cursor: end,
          parts: [
            ...segments.parts,
            `${categoryColors[index % categoryColors.length]} ${start}% ${end}%`,
          ],
        };
      },
      { cursor: 0, parts: [] as string[] },
    )
    .parts.join(", ");
  const liveMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now);
  const liveTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(now);

  const nextTrip = state.trips
    .toSorted((a, b) => compareDateStrings(a.startDate, b.startDate))
    .find((trip) => compareDateStrings(trip.endDate, dateInputValue(new Date())) >= 0);

  const foodSuggestions = useMemo(
    () =>
      Array.from(
        new Map(
          [
            ...state.mealCatalog.map((meal) => [meal.name.trim().toLowerCase(), meal.name.trim()] as const),
            ...state.meals.map((meal) => [meal.food.trim().toLowerCase(), meal.food.trim()] as const),
          ].filter(([, name]) => Boolean(name)),
        ).values(),
      ).toSorted((a, b) => a.localeCompare(b)),
    [state.mealCatalog, state.meals],
  );

  const filteredMealCatalog = useMemo(() => {
    const search = mealSearch.trim().toLowerCase();

    return state.mealCatalog
      .filter((meal) => {
        if (!search) {
          return true;
        }

        return `${meal.name} ${meal.notes}`.toLowerCase().includes(search);
      })
      .toSorted((a, b) => a.name.localeCompare(b.name));
  }, [mealSearch, state.mealCatalog]);

  const calendarDays = useMemo(() => {
    const year = activeMonth.getFullYear();
    const month = activeMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = daysInMonth(year, month);
    const cells: Array<string | null> = Array.from({ length: firstDay }, () => null);

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(dateInputValue(new Date(year, month, day)));
    }

    return cells;
  }, [activeMonth]);

  const foodCalendarDays = useMemo(() => {
    const year = foodMonth.getFullYear();
    const month = foodMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = daysInMonth(year, month);
    const cells: Array<string | null> = Array.from({ length: firstDay }, () => null);

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(dateInputValue(new Date(year, month, day)));
    }

    return cells;
  }, [foodMonth]);

  function updateCategory(id: string, patch: Partial<Category>) {
    setState((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === id ? { ...category, ...patch } : category,
      ),
    }));
  }

  function updateCategorySubItem(categoryId: string, subItemId: string, patch: Partial<CategorySubItem>) {
    setState((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              subItems: (category.subItems ?? []).map((item) =>
                item.id === subItemId ? { ...item, ...patch } : item,
              ),
            }
          : category,
      ),
    }));
  }

  function addCategorySubItem(categoryId: string) {
    setState((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              subItems: [
                ...(category.subItems ?? []),
                {
                  id: createId("sub-allocation"),
                  name: "",
                  percent: 0,
                },
              ],
            }
          : category,
      ),
    }));
  }

  function removeCategorySubItem(categoryId: string, subItemId: string) {
    setState((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              subItems: (category.subItems ?? []).filter((item) => item.id !== subItemId),
            }
          : category,
      ),
    }));
  }

  function getMeal(date: string, meal: MealPlan["meal"]) {
    return state.meals.find((item) => item.date === date && item.meal === meal);
  }

  function openMealSlot(date: string, meal: MealPlan["meal"]) {
    const currentMeal = getMeal(date, meal);
    setSelectedMealSlot({ date, meal });
    setMealDraft({
      food: currentMeal?.food ?? "",
      notes: currentMeal?.notes ?? "",
    });
  }

  function saveMealSlot() {
    if (!selectedMealSlot) {
      return;
    }

    const existing = getMeal(selectedMealSlot.date, selectedMealSlot.meal);

    setState((current) => ({
      ...current,
      meals: existing
        ? current.meals.map((meal) =>
            meal.id === existing.id
              ? {
                  ...meal,
                  food: mealDraft.food,
                  notes: mealDraft.notes,
                }
              : meal,
          )
        : [
            ...current.meals,
            {
              id: createId("meal"),
              date: selectedMealSlot.date,
              meal: selectedMealSlot.meal,
              food: mealDraft.food,
              notes: mealDraft.notes,
            },
          ],
    }));
  }

  function deleteMealSlot() {
    if (!selectedMealSlot) {
      return;
    }

    setState((current) => ({
      ...current,
      meals: current.meals.filter(
        (meal) => !(meal.date === selectedMealSlot.date && meal.meal === selectedMealSlot.meal),
      ),
    }));
    setMealDraft({ food: "", notes: "" });
  }

  function applyMealFromCatalog(meal: MealCatalogItem) {
    setMealDraft({
      food: meal.name,
      notes: meal.notes,
    });
    setMealSearch(meal.name);
  }

  function addMealToCatalog() {
    const name = mealLibraryDraft.name.trim();

    if (!name) {
      return;
    }

    setState((current) => {
      const existing = current.mealCatalog.find((meal) => meal.name.trim().toLowerCase() === name.toLowerCase());

      if (existing) {
        return {
          ...current,
          mealCatalog: current.mealCatalog.map((meal) =>
            meal.id === existing.id ? { ...meal, name, notes: mealLibraryDraft.notes } : meal,
          ),
        };
      }

      return {
        ...current,
        mealCatalog: [
          ...current.mealCatalog,
          {
            id: createId("meal-catalog"),
            name,
            notes: mealLibraryDraft.notes,
          },
        ],
      };
    });
    setMealSearch(name);
    setMealLibraryDraft({ name: "", notes: "" });
  }

  function deleteMealFromCatalog(id: string) {
    setState((current) => ({
      ...current,
      mealCatalog: current.mealCatalog.filter((meal) => meal.id !== id),
    }));
  }

  function startPhilDrag(event: ReactPointerEvent<HTMLElement>) {
    const originX = event.clientX - philPosition.x;
    const originY = event.clientY - philPosition.y;
    const startX = event.clientX;
    const startY = event.clientY;

    philDraggedRef.current = false;

    event.currentTarget.setPointerCapture(event.pointerId);

    function movePhil(moveEvent: PointerEvent) {
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 6) {
        philDraggedRef.current = true;
      }

      setPhilPosition({
        x: Math.max(12, Math.min(window.innerWidth - 82, moveEvent.clientX - originX)),
        y: Math.max(12, Math.min(window.innerHeight - 82, moveEvent.clientY - originY)),
      });
    }

    function stopPhil() {
      window.removeEventListener("pointermove", movePhil);
      window.removeEventListener("pointerup", stopPhil);
    }

    window.addEventListener("pointermove", movePhil);
    window.addEventListener("pointerup", stopPhil);
  }

  async function askPhil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!philInput.trim() || philLoading) {
      return;
    }

    const userMessage: PhilMessage = {
      id: createId("phil-user"),
      role: "user",
      content: philInput.trim(),
    };

    setPhilMessages((current) => [...current, userMessage]);
    setPhilInput("");
    setPhilLoading(true);

    try {
      const response = await fetch("/api/phil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage.content,
          state,
          messages: philMessages.slice(-8),
        }),
      });
      const result = (await response.json()) as { answer?: string; error?: string };

      setPhilMessages((current) => [
        ...current,
        {
          id: createId("phil-assistant"),
          role: "assistant",
          content: result.answer ?? result.error ?? "Phil could not answer yet.",
        },
      ]);
    } catch {
      setPhilMessages((current) => [
        ...current,
        {
          id: createId("phil-error"),
          role: "assistant",
          content: "Phil could not reach the advisor API. Check your OpenAI API key setup.",
        },
      ]);
    } finally {
      setPhilLoading(false);
    }
  }

  const philPanelStyle = useMemo<CSSProperties>(
    () => ({
      left: philPosition.x < 310 ? 0 : undefined,
      right: philPosition.x < 310 ? undefined : 0,
      top: philPosition.y < 430 ? 82 : undefined,
      bottom: philPosition.y < 430 ? undefined : 82,
    }),
    [philPosition.x, philPosition.y],
  );

  function readImageFile(file: File, onReady: (imageUrl: string) => void) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        onReady(reader.result);
      }
    });
    reader.readAsDataURL(file);
  }

  function updateObligation(id: string, patch: Partial<Obligation>) {
    setState((current) => ({
      ...current,
      obligations: current.obligations.map((obligation) =>
        obligation.id === id ? { ...obligation, ...patch } : obligation,
      ),
    }));
  }

  function updatePurchaseGoal(id: string, patch: Partial<PurchaseGoal>) {
    setState((current) => ({
      ...current,
      purchaseGoals: current.purchaseGoals.map((goal) =>
        goal.id === id ? { ...goal, ...patch } : goal,
      ),
    }));
  }

  function updateTrip(id: string, patch: Partial<Trip>) {
    setState((current) => ({
      ...current,
      trips: current.trips.map((trip) => (trip.id === id ? { ...trip, ...patch } : trip)),
    }));
  }

  function remainingMonths(obligation: Obligation) {
    if (obligation.kind === "fixed") {
      return Infinity;
    }

    return Math.max(0, obligation.totalMonths - monthDiff(obligation.startMonth));
  }

  function addCategory() {
    setState((current) => ({
      ...current,
      categories: [
        ...current.categories,
        {
          id: createId("category"),
          name: "New Category",
          percent: 5,
          destination: "Assign destination",
        },
      ],
    }));
  }

  function addObligation(kind: Obligation["kind"]) {
    setState((current) => ({
      ...current,
      obligations: [
        ...current.obligations,
        {
          id: createId("obligation"),
          name: kind === "fixed" ? "New bill" : "New debt",
          amount: 5000,
          destination: "Bank / App",
          kind,
          startMonth: monthInputValue(new Date()),
          totalMonths: kind === "fixed" ? 0 : 6,
        },
      ],
    }));
  }

  function addPurchaseGoal() {
    setState((current) => ({
      ...current,
      purchaseGoals: [
        ...current.purchaseGoals,
        {
          id: createId("purchase"),
          item: "New gear",
          price: 10000,
          availableFund: 0,
          monthlyContribution: 1000,
        },
      ],
    }));
  }

  function addTrip() {
    const startDate =
      compareDateStrings(draftTrip.startDate, draftTrip.endDate) <= 0
        ? draftTrip.startDate
        : draftTrip.endDate;
    const endDate =
      compareDateStrings(draftTrip.startDate, draftTrip.endDate) <= 0
        ? draftTrip.endDate
        : draftTrip.startDate;

    setState((current) => ({
      ...current,
      trips: [
        ...current.trips,
        {
          id: createId("trip"),
          ...draftTrip,
          startDate,
          endDate,
          color: tripColors[current.trips.length % tripColors.length],
        },
      ],
    }));
  }

  function selectCalendarDate(date: string) {
    if (selectingRange === "start") {
      setDraftTrip((current) => ({ ...current, startDate: date, endDate: date }));
      setSelectingRange("end");
      return;
    }

    setDraftTrip((current) => {
      const startDate = compareDateStrings(current.startDate, date) <= 0 ? current.startDate : date;
      const endDate = compareDateStrings(current.startDate, date) <= 0 ? date : current.startDate;
      return { ...current, startDate, endDate };
    });
    setSelectingRange("start");
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.logoMark} aria-hidden="true">
              <span>LO</span>
            </div>
            <div>
              <strong>LifeOS</strong>
              <span>Money, trips, goals</span>
              <small
                className={[
                  styles.syncBadge,
                  syncState.status === "Synced" ? styles.syncBadgeSynced : "",
                  syncState.status === "Setup needed" || syncState.status === "Error"
                    ? styles.syncBadgeError
                    : "",
                ].join(" ")}
                title={syncState.detail}
              >
                <Database size={12} aria-hidden="true" />
                {syncState.status}
              </small>
            </div>
          </div>

          {syncState.status !== "Local only" ? (
            userEmail ? (
              <div className={styles.accountPanel}>
                <span>{userEmail}</span>
                <button type="button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            ) : (
              <form className={styles.authPanel} onSubmit={handleAuthSubmit}>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="Email"
                  required
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Password"
                  minLength={6}
                  required
                />
                <button type="submit" disabled={authLoading}>
                  {authLoading ? "..." : authMode === "sign-in" ? "Sign in" : "Sign up"}
                </button>
                <button
                  className={styles.authModeButton}
                  type="button"
                  onClick={() => setAuthMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))}
                >
                  {authMode === "sign-in" ? "New?" : "Have account?"}
                </button>
              </form>
            )
          ) : null}

          <nav className={styles.tabs} aria-label="LifeOS sections">
            <button
              className={activeTab === "overview" ? styles.activeTab : ""}
              type="button"
              onClick={() => setActiveTab("overview")}
            >
              <LayoutDashboard size={17} aria-hidden="true" />
              Overview
            </button>
            <button
              className={activeTab === "budget" ? styles.activeTab : ""}
              type="button"
              onClick={() => setActiveTab("budget")}
            >
              <Coins size={17} aria-hidden="true" />
              Budget
            </button>
            <button
              className={activeTab === "travel" ? styles.activeTab : ""}
              type="button"
              onClick={() => setActiveTab("travel")}
            >
              <Compass size={17} aria-hidden="true" />
              Travel
            </button>
            <button
              className={activeTab === "food" ? styles.activeTab : ""}
              type="button"
              onClick={() => setActiveTab("food")}
            >
              <ChefHat size={17} aria-hidden="true" />
              Food
            </button>
          </nav>
        </header>

        <nav
          className={[styles.floatingTabs, isScrolled ? styles.floatingTabsVisible : ""].join(" ")}
          aria-label="Sticky LifeOS sections"
        >
          <button
            className={activeTab === "overview" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard size={17} aria-hidden="true" />
            Overview
          </button>
          <button
            className={activeTab === "budget" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveTab("budget")}
          >
            <Coins size={17} aria-hidden="true" />
            Budget
          </button>
          <button
            className={activeTab === "travel" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveTab("travel")}
          >
            <Compass size={17} aria-hidden="true" />
            Travel
          </button>
          <button
            className={activeTab === "food" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveTab("food")}
          >
            <ChefHat size={17} aria-hidden="true" />
            Food
          </button>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Activity size={15} aria-hidden="true" />
              Realtime analytics
            </p>
            <h1>{liveMonth} money cockpit</h1>
            <p className={styles.heroSubcopy}>
              Live view of stash health, monthly power, protected cash, and bills pressure.
            </p>
            <div className={styles.powerLevelCard}>
              <div className={styles.powerOrb}>
                <Crown size={24} aria-hidden="true" />
                <strong>LVL {powerLevelIndex + 1}</strong>
              </div>
              <div className={styles.powerLevelBody}>
                <div>
                  <span>Buying Power Level</span>
                  <strong>{powerLevel.name}</strong>
                  <small>{powerLevel.tone} mode</small>
                </div>
                <div className={styles.powerMeter}>
                  <i style={{ width: `${Math.max(0, Math.min(powerLevelProgress, 100))}%` }} />
                </div>
                <div className={styles.powerStats}>
                  <span>Stash {Math.round(Math.min(state.stash / 250000, 1) * 100)}%</span>
                  <span>Protected {Math.round(protectedRatio * 100)}%</span>
                  <span>Runway {monthlyRemaining >= 0 ? "Clear" : "Tight"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.analyticsBoard}>
            <div className={styles.liveBadge}>
              <Sparkles size={15} aria-hidden="true" />
              Updated {liveTime}
            </div>
            <div className={styles.analyticsControls}>
              <label>
                <span>Total stash</span>
                <input
                  type="number"
                  min="0"
                  value={state.stash}
                  onChange={(event) =>
                    setState((current) => ({ ...current, stash: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                <span>Monthly power rate</span>
                <div className={styles.controlSlider}>
                  <strong>{state.buyingPowerPercent}%</strong>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={state.buyingPowerPercent}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        buyingPowerPercent: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </label>
            </div>
            <div className={styles.analyticsGrid}>
              <article className={styles.analyticsPrimary}>
                <span>Stash</span>
                <strong>{currency.format(state.stash)}</strong>
                <p>Trading capital bank</p>
              </article>
              <article className={styles.analyticsPrimary}>
                <span>Monthly Power</span>
                <strong>{currency.format(buyingPower)}</strong>
                <p>{state.buyingPowerPercent}% released this month</p>
              </article>
              <article>
                <ShieldCheck size={18} aria-hidden="true" />
                <span>Protected</span>
                <strong>{currency.format(protectedCash)}</strong>
              </article>
              <article>
                <TrendingUp size={18} aria-hidden="true" />
                <span>Obligation runway</span>
                <strong className={monthlyRemaining >= 0 ? styles.good : styles.warn}>
                  {currency.format(monthlyRemaining)}
                </strong>
              </article>
            </div>
          </div>
        </section>

        {activeTab === "overview" && (
          <section className={styles.workspace}>
            <div className={styles.metricGrid}>
              <article className={styles.metricCard}>
                <PiggyBank size={22} aria-hidden="true" />
                <span>Stash protected</span>
                <strong>{currency.format(protectedCash)}</strong>
                <p>{100 - state.buyingPowerPercent}% stays out of monthly allocation.</p>
              </article>
              <article className={styles.metricCard}>
                <WalletCards size={22} aria-hidden="true" />
                <span>Monthly power</span>
                <strong>{currency.format(buyingPower)}</strong>
                <p>Starting rate is intentionally conservative at {state.buyingPowerPercent}%.</p>
              </article>
              <article className={styles.metricCard}>
                <Banknote size={22} aria-hidden="true" />
                <span>Bills pressure</span>
                <strong className={monthlyEnvelope - monthlyDue >= 0 ? styles.good : styles.warn}>
                  {currency.format(monthlyEnvelope - monthlyDue)}
                </strong>
                <p>Monthly obligations envelope minus committed payments.</p>
              </article>
              <article className={styles.metricCard}>
                <Plane size={22} aria-hidden="true" />
                <span>Next trip</span>
                <strong>{nextTrip ? nextTrip.whereTo : "No trip yet"}</strong>
                <p>{nextTrip ? `${nextTrip.startDate} to ${nextTrip.endDate}` : "Add one in Travel."}</p>
              </article>
            </div>

            <section className={styles.analyticsCanvas}>
              <article className={styles.donutPanel}>
                <div className={styles.panelTitle}>
                  <Target size={20} aria-hidden="true" />
                  <div>
                    <h2>Allocation Mix</h2>
                    <p>How monthly power is divided across your current money system.</p>
                  </div>
                </div>
                <div className={styles.donutWrap}>
                  <div
                    className={styles.donut}
                    style={
                      {
                        "--donut": allocationGradient || "#e5e7eb 0% 100%",
                      } as CSSProperties
                    }
                  >
                    <span>{categoryTotal}%</span>
                    <small>mapped</small>
                  </div>
                  <div className={styles.legendList}>
                    {state.categories.map((category, index) => (
                      <div key={category.id}>
                        <i style={{ background: categoryColors[index % categoryColors.length] }} />
                        <span>{category.name}</span>
                        <strong>{category.percent}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelTitle}>
                  <PiggyBank size={20} aria-hidden="true" />
                  <div>
                    <h2>Cashflow Shape</h2>
                    <p>Stash, protected capital, released monthly power, and bills pressure.</p>
                  </div>
                </div>
                <div className={styles.cashflowBars}>
                  <div>
                    <span>Protected</span>
                    <strong>{currency.format(protectedCash)}</strong>
                    <i style={{ width: `${Math.min((protectedCash / Math.max(state.stash, 1)) * 100, 100)}%` }} />
                  </div>
                  <div>
                    <span>Monthly power</span>
                    <strong>{currency.format(buyingPower)}</strong>
                    <i style={{ width: `${Math.min(state.buyingPowerPercent, 100)}%` }} />
                  </div>
                  <div>
                    <span>Obligations used</span>
                    <strong>{currency.format(monthlyDue)}</strong>
                    <i style={{ width: `${Math.min((monthlyDue / Math.max(buyingPower, 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelTitle}>
                  <Banknote size={20} aria-hidden="true" />
                  <div>
                    <h2>Obligation Split</h2>
                    <p>Fixed monthly needs versus temporary debt payments.</p>
                  </div>
                </div>
                <div className={styles.splitChart}>
                  <div>
                    <span>Fixed</span>
                    <strong>{currency.format(fixedObligations)}</strong>
                    <i style={{ width: `${Math.min((fixedObligations / Math.max(monthlyDue, 1)) * 100, 100)}%` }} />
                  </div>
                  <div>
                    <span>Debt</span>
                    <strong>{currency.format(debtObligations)}</strong>
                    <i style={{ width: `${Math.min((debtObligations / Math.max(monthlyDue, 1)) * 100, 100)}%` }} />
                  </div>
                </div>
                <div className={styles.insightBox}>
                  <span>Remaining after monthly obligations</span>
                  <strong className={monthlyRemaining >= 0 ? styles.good : styles.warn}>
                    {currency.format(monthlyRemaining)}
                  </strong>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelTitle}>
                  <Plane size={20} aria-hidden="true" />
                  <div>
                    <h2>Travel Snapshot</h2>
                    <p>Planned travel budget and upcoming movement.</p>
                  </div>
                </div>
                <div className={styles.travelAnalytics}>
                  <div>
                    <span>Total planned</span>
                    <strong>{currency.format(tripBudgetTotal)}</strong>
                  </div>
                  <div>
                    <span>Trips</span>
                    <strong>{state.trips.length}</strong>
                  </div>
                  <div>
                    <span>Next</span>
                    <strong>{nextTrip ? nextTrip.whereTo : "None"}</strong>
                  </div>
                </div>
                <div className={styles.tripList}>
                  {state.trips.map((trip) => (
                    <div className={styles.tripItem} key={trip.id}>
                      <MapPin size={18} aria-hidden="true" />
                      <div>
                        <strong>{trip.whereTo}</strong>
                        <span>
                          {trip.startDate} to {trip.endDate} - {currency.format(trip.budget)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

            </section>
          </section>
        )}

        {activeTab === "budget" && (
          <section className={styles.workspace}>
            <nav className={styles.subTabs} aria-label="Budget sections">
              <button
                className={activeBudgetTab === "allocations" ? styles.activeSubTab : ""}
                type="button"
                onClick={() => setActiveBudgetTab("allocations")}
              >
                <Target size={16} aria-hidden="true" />
                Allocations
              </button>
              <button
                className={activeBudgetTab === "obligations" ? styles.activeSubTab : ""}
                type="button"
                onClick={() => setActiveBudgetTab("obligations")}
              >
                <Banknote size={16} aria-hidden="true" />
                Monthly Obligations
              </button>
              <button
                className={activeBudgetTab === "buy-list" ? styles.activeSubTab : ""}
                type="button"
                onClick={() => setActiveBudgetTab("buy-list")}
              >
                <Gamepad2 size={16} aria-hidden="true" />
                Buy List
              </button>
            </nav>

            {activeBudgetTab === "allocations" && (
              <article className={styles.widePanel}>
                <div className={styles.sectionHead}>
                  <div>
                    <h2>Allocation Map</h2>
                    <p>Edit category names, percentages, and destination bank or app.</p>
                  </div>
                  <button className={styles.iconButton} type="button" onClick={addCategory} title="Add category">
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.totalBar}>
                  <span>Total allocation</span>
                  <strong className={categoryTotal === 100 ? styles.good : styles.warn}>{categoryTotal}%</strong>
                </div>

                <div className={styles.categoryList}>
                  {state.categories.map((category, index) => {
                    const allocation = buyingPower * (category.percent / 100);
                    const subTotal = (category.subItems ?? []).reduce((sum, item) => sum + item.percent, 0);
                    const isExpanded = expandedCategoryId === category.id;

                    return (
                      <div className={styles.categoryBlock} key={category.id}>
                        <div className={styles.categoryRow}>
                          <span
                            className={styles.colorDot}
                            style={{ background: categoryColors[index % categoryColors.length] }}
                          />
                          <input
                            className={styles.nameInput}
                            value={category.name}
                            onChange={(event) => updateCategory(category.id, { name: event.target.value })}
                          />
                          <div className={styles.percentCell}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={category.percent}
                              onChange={(event) =>
                                updateCategory(category.id, { percent: Number(event.target.value) })
                              }
                            />
                            <span>%</span>
                          </div>
                          <input
                            className={styles.destinationInput}
                            value={category.destination}
                            onChange={(event) =>
                              updateCategory(category.id, { destination: event.target.value })
                            }
                          />
                          <strong>{currency.format(allocation)}</strong>
                          <button
                            className={styles.expandButton}
                            type="button"
                            title="Sub allocations"
                            onClick={() => setExpandedCategoryId(isExpanded ? null : category.id)}
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown size={16} aria-hidden="true" />
                          </button>
                          <button
                            className={styles.ghostIcon}
                            type="button"
                            title="Remove category"
                            onClick={() =>
                              setState((current) => ({
                                ...current,
                                categories: current.categories.filter((item) => item.id !== category.id),
                              }))
                            }
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>

                        {isExpanded ? (
                          <div className={styles.subAllocationPanel}>
                            <div className={styles.subAllocationHead}>
                              <div>
                                <strong>Sub allocation</strong>
                                <span>
                                  {subTotal}% of {category.percent}% mapped
                                </span>
                              </div>
                              <button type="button" onClick={() => addCategorySubItem(category.id)}>
                                <Plus size={15} aria-hidden="true" />
                                Add sub
                              </button>
                            </div>

                            {(category.subItems ?? []).length ? (
                              <div className={styles.subAllocationList}>
                                {(category.subItems ?? []).map((item) => {
                                  const subAmount = allocation * (item.percent / 100);

                                  return (
                                    <div className={styles.subAllocationRow} key={item.id}>
                                      <input
                                        value={item.name}
                                        placeholder="Optional name"
                                        onChange={(event) =>
                                          updateCategorySubItem(category.id, item.id, {
                                            name: event.target.value,
                                          })
                                        }
                                      />
                                      <div className={styles.percentCell}>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={item.percent}
                                          onChange={(event) =>
                                            updateCategorySubItem(category.id, item.id, {
                                              percent: Number(event.target.value),
                                            })
                                          }
                                        />
                                        <span>%</span>
                                      </div>
                                      <strong>{currency.format(subAmount)}</strong>
                                      <button
                                        className={styles.ghostIcon}
                                        type="button"
                                        title="Remove sub allocation"
                                        onClick={() => removeCategorySubItem(category.id, item.id)}
                                      >
                                        <Trash2 size={15} aria-hidden="true" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className={styles.emptySubAllocation}>
                                Optional. Add sub percentages only when you want detail here.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            )}

            {activeBudgetTab === "obligations" && (
              <section className={styles.obligationsWorkspace}>
                <article className={styles.widePanel}>
                  <div className={styles.sectionHead}>
                    <div>
                      <h2>Monthly Obligations</h2>
                      <p>Separate fixed bills from debts and keep the long list easy to scan.</p>
                    </div>
                    <div className={styles.headerActions}>
                      <button type="button" onClick={() => addObligation("fixed")}>
                        <Plus size={16} aria-hidden="true" />
                        No end
                      </button>
                      <button type="button" onClick={() => addObligation("debt")}>
                        <Plus size={16} aria-hidden="true" />
                        Debt
                      </button>
                    </div>
                  </div>

                  <div className={styles.obligationSummary}>
                    <div>
                      <span>Envelope</span>
                      <strong>{currency.format(monthlyEnvelope)}</strong>
                    </div>
                    <div>
                      <span>Committed</span>
                      <strong>{currency.format(monthlyDue)}</strong>
                    </div>
                    <div>
                      <span>Remaining</span>
                      <strong className={monthlyEnvelope - monthlyDue >= 0 ? styles.good : styles.warn}>
                        {currency.format(monthlyEnvelope - monthlyDue)}
                      </strong>
                    </div>
                    <div>
                      <span>Items</span>
                      <strong>{state.obligations.length}</strong>
                    </div>
                  </div>
                </article>

                <section className={styles.obligationBoard}>
                  <article className={styles.obligationGroup}>
                    <div className={styles.groupHead}>
                      <div>
                        <h3>No End Bills</h3>
                        <p>Rent, groceries, subscriptions, and other recurring payments.</p>
                      </div>
                      <strong>{fixedObligationItems.length}</strong>
                    </div>

                    <div className={styles.compactRows}>
                      {fixedObligationItems.map((obligation) => (
                        <div className={styles.compactRow} key={obligation.id}>
                          <input
                            value={obligation.name}
                            onChange={(event) =>
                              updateObligation(obligation.id, { name: event.target.value })
                            }
                          />
                          <input
                            type="number"
                            min="0"
                            value={obligation.amount}
                            onChange={(event) =>
                              updateObligation(obligation.id, { amount: Number(event.target.value) })
                            }
                          />
                          <input
                            value={obligation.destination}
                            onChange={(event) =>
                              updateObligation(obligation.id, { destination: event.target.value })
                            }
                          />
                          <button
                            className={styles.ghostIcon}
                            type="button"
                            title="Remove bill"
                            onClick={() =>
                              setState((current) => ({
                                ...current,
                                obligations: current.obligations.filter((item) => item.id !== obligation.id),
                              }))
                            }
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className={styles.obligationGroup}>
                    <div className={styles.groupHead}>
                      <div>
                        <h3>Debt Paydown</h3>
                        <p>Cards and loans with a countdown, compact enough for a long list.</p>
                      </div>
                      <strong>{debtObligationItems.length}</strong>
                    </div>

                    <div className={styles.debtTable}>
                      <div className={styles.debtHeader}>
                        <span>Name</span>
                        <span>Monthly</span>
                        <span>Start</span>
                        <span>Months</span>
                        <span>Left</span>
                        <span>Destination</span>
                        <span />
                      </div>
                      {debtObligationItems.map((obligation) => {
                        const remaining = remainingMonths(obligation);

                        return (
                          <div className={styles.debtRow} key={obligation.id}>
                            <input
                              value={obligation.name}
                              onChange={(event) =>
                                updateObligation(obligation.id, { name: event.target.value })
                              }
                            />
                            <input
                              type="number"
                              min="0"
                              value={obligation.amount}
                              onChange={(event) =>
                                updateObligation(obligation.id, { amount: Number(event.target.value) })
                              }
                            />
                            <input
                              type="month"
                              value={obligation.startMonth}
                              onChange={(event) =>
                                updateObligation(obligation.id, { startMonth: event.target.value })
                              }
                            />
                            <input
                              type="number"
                              min="0"
                              value={obligation.totalMonths}
                              onChange={(event) =>
                                updateObligation(obligation.id, { totalMonths: Number(event.target.value) })
                              }
                            />
                            <strong>{remaining} mo</strong>
                            <input
                              value={obligation.destination}
                              onChange={(event) =>
                                updateObligation(obligation.id, { destination: event.target.value })
                              }
                            />
                            <button
                              className={styles.ghostIcon}
                              type="button"
                              title="Remove debt"
                              onClick={() =>
                                setState((current) => ({
                                  ...current,
                                  obligations: current.obligations.filter((item) => item.id !== obligation.id),
                                }))
                              }
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                </section>
              </section>
            )}

            {activeBudgetTab === "buy-list" && (
              <article className={`${styles.widePanel} ${styles.purchasePanel}`}>
                <div className={styles.sectionHead}>
                  <div className={styles.panelTitle}>
                    <Gamepad2 size={20} aria-hidden="true" />
                    <div>
                      <h2>Buy List</h2>
                      <p>Track gear goals against your available fund and monthly contribution.</p>
                    </div>
                  </div>
                  <button className={styles.iconButton} type="button" onClick={addPurchaseGoal} title="Add item">
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.purchaseList}>
                  {state.purchaseGoals.map((goal) => {
                    const remaining = Math.max(goal.price - goal.availableFund, 0);
                    const readyMonths =
                      remaining === 0
                        ? 0
                        : goal.monthlyContribution > 0
                          ? Math.ceil(remaining / goal.monthlyContribution)
                          : Infinity;
                    const isSafe = remaining === 0 && monthlyRemaining >= 0;
                    const progress = Math.min((goal.availableFund / Math.max(goal.price, 1)) * 100, 100);

                    return (
                      <div className={styles.purchaseCard} key={goal.id}>
                        <div className={styles.purchaseTop}>
                          <div className={styles.purchaseIcon}>
                            <Gamepad2 size={22} aria-hidden="true" />
                          </div>
                          <div>
                            <input
                              aria-label="Item name"
                              value={goal.item}
                              onChange={(event) => updatePurchaseGoal(goal.id, { item: event.target.value })}
                            />
                            <span>{currency.format(goal.price)} target price</span>
                          </div>
                          <button
                            className={styles.ghostIcon}
                            type="button"
                            title="Remove item"
                            onClick={() =>
                              setState((current) => ({
                                ...current,
                                purchaseGoals: current.purchaseGoals.filter((item) => item.id !== goal.id),
                              }))
                            }
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>

                        <div className={styles.purchaseProgress}>
                          <i style={{ width: `${progress}%` }} />
                        </div>

                        <div className={styles.purchaseInputs}>
                          <label>
                            <span>Price</span>
                            <input
                              type="number"
                              min="0"
                              value={goal.price}
                              onChange={(event) => updatePurchaseGoal(goal.id, { price: Number(event.target.value) })}
                            />
                          </label>
                          <label>
                            <span>Available tech fund</span>
                            <input
                              type="number"
                              min="0"
                              value={goal.availableFund}
                              onChange={(event) =>
                                updatePurchaseGoal(goal.id, { availableFund: Number(event.target.value) })
                              }
                            />
                          </label>
                          <label>
                            <span>Monthly contribution</span>
                            <input
                              type="number"
                              min="0"
                              value={goal.monthlyContribution}
                              onChange={(event) =>
                                updatePurchaseGoal(goal.id, { monthlyContribution: Number(event.target.value) })
                              }
                            />
                          </label>
                        </div>

                        <div className={styles.purchaseStats}>
                          <div>
                            <span>Remaining</span>
                            <strong>{currency.format(remaining)}</strong>
                          </div>
                          <div>
                            <span>Ready in</span>
                            <strong>
                              {readyMonths === Infinity
                                ? "No plan"
                                : readyMonths === 0
                                  ? "Now"
                                  : `${readyMonths} months`}
                            </strong>
                          </div>
                          <div>
                            <span>Status</span>
                            <strong className={isSafe ? styles.safePill : styles.notSafePill}>
                              {isSafe ? "Safe to buy" : "Not yet safe"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            )}
          </section>
        )}

        {activeTab === "travel" && (
          <section className={styles.workspace}>
            <section className={styles.travelSection}>
              <article className={styles.panel}>
                <div className={styles.panelTitle}>
                  <Plane size={20} aria-hidden="true" />
                  <div>
                    <h2>Travel Goal</h2>
                    <p>Add a destination, purpose, budget, and date range.</p>
                  </div>
                </div>
                <div className={styles.tripForm}>
                  <label>
                    <span>Where to</span>
                    <input
                      value={draftTrip.whereTo}
                      onChange={(event) =>
                        setDraftTrip((current) => ({ ...current, whereTo: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Purpose</span>
                    <input
                      value={draftTrip.purpose}
                      onChange={(event) =>
                        setDraftTrip((current) => ({ ...current, purpose: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Budget</span>
                    <input
                      type="number"
                      min="0"
                      value={draftTrip.budget}
                      onChange={(event) =>
                        setDraftTrip((current) => ({ ...current, budget: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <label>
                    <span>Picture URL</span>
                    <input
                      value={draftTrip.imageUrl}
                      onChange={(event) =>
                        setDraftTrip((current) => ({ ...current, imageUrl: event.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </label>
                  <label className={styles.uploadButton}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          readImageFile(file, (imageUrl) =>
                            setDraftTrip((current) => ({ ...current, imageUrl })),
                          );
                        }
                        event.target.value = "";
                      }}
                    />
                    Choose picture
                  </label>
                </div>
                <div className={styles.dateChips}>
                  <button
                    className={selectingRange === "start" ? styles.activeChip : ""}
                    type="button"
                    onClick={() => setSelectingRange("start")}
                  >
                    Start {draftTrip.startDate}
                  </button>
                  <button
                    className={selectingRange === "end" ? styles.activeChip : ""}
                    type="button"
                    onClick={() => setSelectingRange("end")}
                  >
                    End {draftTrip.endDate}
                  </button>
                </div>
                <button className={styles.primaryButton} type="button" onClick={addTrip}>
                  <Plus size={16} aria-hidden="true" />
                  Add travel plan
                </button>

                <div className={styles.tripList}>
                  {state.trips.map((trip, tripIndex) => (
                    <div className={styles.tripItem} key={trip.id}>
                      <span
                        className={styles.tripColorDot}
                        style={{ background: trip.color ?? tripColors[tripIndex % tripColors.length] }}
                      />
                      <div>
                        <strong>{trip.whereTo}</strong>
                        <span>
                          {trip.startDate} to {trip.endDate} - {currency.format(trip.budget)}
                        </span>
                        <input
                          className={styles.tripImageInput}
                          value={trip.imageUrl ?? ""}
                          onChange={(event) => updateTrip(trip.id, { imageUrl: event.target.value })}
                          placeholder="Add picture URL for hover preview"
                          aria-label={`${trip.whereTo} picture URL`}
                        />
                        <label className={styles.tripUploadButton}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                readImageFile(file, (imageUrl) => updateTrip(trip.id, { imageUrl }));
                              }
                              event.target.value = "";
                            }}
                          />
                          Choose from PC
                        </label>
                      </div>
                      <button
                        className={styles.ghostIcon}
                        type="button"
                        title="Remove trip"
                        onClick={() =>
                          setState((current) => ({
                            ...current,
                            trips: current.trips.filter((item) => item.id !== trip.id),
                          }))
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.calendarPanel}>
                <div className={styles.calendarHead}>
                  <button
                    className={styles.iconButton}
                    type="button"
                    title="Previous month"
                    onClick={() => setActiveMonth((current) => addMonths(current, -1))}
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <div>
                    <CalendarDays size={18} aria-hidden="true" />
                    <strong>
                      {monthNames[activeMonth.getMonth()]} {activeMonth.getFullYear()}
                    </strong>
                  </div>
                  <button
                    className={styles.iconButton}
                    type="button"
                    title="Next month"
                    onClick={() => setActiveMonth((current) => addMonths(current, 1))}
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.calendarGrid}>
                  {dayLabels.map((label) => (
                    <span className={styles.dayLabel} key={label}>
                      {label}
                    </span>
                  ))}
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <span className={styles.emptyDay} key={`empty-${index}`} />;
                    }

                    const day = parseLocalDate(date).getDate();
                    const inDraftRange = isBetween(date, draftTrip.startDate, draftTrip.endDate);
                    const tripsForDay = state.trips
                      .map((item, tripIndex) => ({
                        ...item,
                        color: item.color ?? tripColors[tripIndex % tripColors.length],
                      }))
                      .filter((item) => isBetween(date, item.startDate, item.endDate));
                    const isRangeEdge = date === draftTrip.startDate || date === draftTrip.endDate;
                    const isRangeStart = date === draftTrip.startDate;
                    const isRangeEnd = date === draftTrip.endDate;
                    const hasTripStart = tripsForDay.some((trip) => trip.startDate === date);
                    const hasTripEnd = tripsForDay.some((trip) => trip.endDate === date);

                    return (
                      <button
                        className={[
                          styles.day,
                          inDraftRange ? styles.inRange : "",
                          isRangeStart ? styles.rangeStart : "",
                          isRangeEnd ? styles.rangeEnd : "",
                          isRangeEdge ? styles.rangeEdge : "",
                          tripsForDay.length ? styles.booked : "",
                          hasTripStart ? styles.tripStart : "",
                          hasTripEnd ? styles.tripEnd : "",
                        ].join(" ")}
                        type="button"
                        key={date}
                        onClick={() => selectCalendarDate(date)}
                        title={tripsForDay.length ? tripsForDay.map((trip) => trip.whereTo).join(", ") : "Select date"}
                      >
                        <span>{day}</span>
                        {tripsForDay.length ? (
                          <div className={styles.tripChips}>
                            {tripsForDay.map((trip) => {
                              const isTripStart = trip.startDate === date;
                              const isTripEnd = trip.endDate === date;

                              return (
                                <span
                                  className={[
                                    styles.tripChip,
                                    isTripStart ? styles.tripChipStart : "",
                                    isTripEnd ? styles.tripChipEnd : "",
                                  ].join(" ")}
                                  key={trip.id}
                                  style={{ "--trip-color": trip.color } as CSSProperties}
                                >
                                  {isTripStart ? trip.whereTo : ""}
                                  {trip.imageUrl ? (
                                    <span className={styles.tripPreview}>
                                      <span
                                        className={styles.tripPreviewImage}
                                        style={{ backgroundImage: `url("${trip.imageUrl}")` }}
                                      />
                                      <strong>{trip.whereTo}</strong>
                                      <small>{trip.purpose}</small>
                                    </span>
                                  ) : null}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </article>
            </section>
          </section>
        )}

        {activeTab === "food" && (
          <section className={styles.workspace}>
            <section className={styles.foodSection}>
              <article className={styles.foodCalendarPanel}>
                <div className={styles.calendarHead}>
                  <button
                    className={styles.iconButton}
                    type="button"
                    title="Previous month"
                    onClick={() => setFoodMonth((current) => addMonths(current, -1))}
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <div>
                    <Utensils size={18} aria-hidden="true" />
                    <strong>
                      {monthNames[foodMonth.getMonth()]} {foodMonth.getFullYear()}
                    </strong>
                  </div>
                  <button
                    className={styles.iconButton}
                    type="button"
                    title="Next month"
                    onClick={() => setFoodMonth((current) => addMonths(current, 1))}
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.foodCalendarGrid}>
                  {dayLabels.map((label) => (
                    <span className={styles.dayLabel} key={label}>
                      {label}
                    </span>
                  ))}
                  {foodCalendarDays.map((date, index) => {
                    if (!date) {
                      return <span className={styles.emptyFoodDay} key={`food-empty-${index}`} />;
                    }

                    const brunch = getMeal(date, "brunch");
                    const dinner = getMeal(date, "dinner");

                    return (
                      <div className={styles.foodDay} key={date}>
                        <strong>{parseLocalDate(date).getDate()}</strong>
                        <button
                          className={brunch ? styles.mealFilled : ""}
                          type="button"
                          onClick={() => openMealSlot(date, "brunch")}
                        >
                          <span>Brunch</span>
                          <small>{brunch?.food || "Plan"}</small>
                        </button>
                        <button
                          className={dinner ? styles.mealFilled : ""}
                          type="button"
                          onClick={() => openMealSlot(date, "dinner")}
                        >
                          <span>Dinner</span>
                          <small>{dinner?.food || "Plan"}</small>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>

              <aside className={styles.foodEditor}>
                <div className={styles.panelTitle}>
                  <ChefHat size={20} aria-hidden="true" />
                  <div>
                    <h2>Food Planner</h2>
                    <p>Plan brunch and dinner, then search your saved meals when you need ideas.</p>
                  </div>
                </div>

                <label className={styles.mealSearchBox}>
                  <span>Search meals</span>
                  <div>
                    <Search size={16} aria-hidden="true" />
                    <input
                      value={mealSearch}
                      onChange={(event) => setMealSearch(event.target.value)}
                      placeholder="Search adobo, pasta, brunch..."
                    />
                  </div>
                </label>

                {selectedMealSlot ? (
                  <div className={styles.mealEditorForm}>
                    <div className={styles.selectedMealHeader}>
                      <span>
                        {selectedMealSlot.meal} - {selectedMealSlot.date}
                      </span>
                      <button type="button" onClick={() => setSelectedMealSlot(null)} title="Close editor">
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <label>
                      <span>Food</span>
                      <input
                        value={mealDraft.food}
                        onChange={(event) => setMealDraft((current) => ({ ...current, food: event.target.value }))}
                        placeholder="Type manually or pick from saved meals"
                        list="food-suggestions"
                      />
                    </label>
                    <label>
                      <span>Notes</span>
                      <textarea
                        value={mealDraft.notes}
                        onChange={(event) => setMealDraft((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Prep notes, groceries, calories, anything useful."
                      />
                    </label>
                    <datalist id="food-suggestions">
                      {foodSuggestions.map((food) => (
                        <option value={food} key={food} />
                      ))}
                    </datalist>
                    <div className={styles.mealEditorActions}>
                      <button className={styles.primaryButton} type="button" onClick={saveMealSlot}>
                        Save meal
                      </button>
                      <button className={styles.deleteMealButton} type="button" onClick={deleteMealSlot}>
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.foodEmptyState}>
                    <Utensils size={28} aria-hidden="true" />
                    <strong>Pick brunch or dinner</strong>
                    <span>Click any meal slot in the calendar to add, edit, or delete food.</span>
                  </div>
                )}

                <div className={styles.foodSuggestions}>
                  <h3>Quick ideas</h3>
                  {foodSuggestions.length ? (
                    <div>
                      {foodSuggestions.slice(0, 10).map((food) => (
                        <button
                          type="button"
                          key={food}
                          onClick={() => setMealDraft((current) => ({ ...current, food }))}
                        >
                          {food}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>Add a few meals and Phil will have more context too.</p>
                  )}
                </div>
              </aside>
            </section>

            <section className={styles.mealsLibrary}>
              <div className={styles.panelTitle}>
                <Utensils size={20} aria-hidden="true" />
                <div>
                  <h2>Meals</h2>
                  <p>Add meals you cook often. Search them above, then use one inside brunch or dinner.</p>
                </div>
              </div>

              <div className={styles.mealLibraryForm}>
                <label>
                  <span>Meal name</span>
                  <input
                    value={mealLibraryDraft.name}
                    onChange={(event) => setMealLibraryDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ex. Beef tapa"
                  />
                </label>
                <label>
                  <span>Notes</span>
                  <input
                    value={mealLibraryDraft.notes}
                    onChange={(event) => setMealLibraryDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Ingredients, prep, why you like it..."
                  />
                </label>
                <button className={styles.primaryButton} type="button" onClick={addMealToCatalog}>
                  Add meal
                </button>
              </div>

              <div className={styles.mealLibraryGrid}>
                {filteredMealCatalog.length ? (
                  filteredMealCatalog.map((meal) => (
                    <article className={styles.mealLibraryCard} key={meal.id}>
                      <div>
                        <strong>{meal.name}</strong>
                        <p>{meal.notes || "No notes yet."}</p>
                      </div>
                      <div>
                        <button type="button" onClick={() => applyMealFromCatalog(meal)}>
                          Use
                        </button>
                        <button type="button" onClick={() => deleteMealFromCatalog(meal.id)} title={`Delete ${meal.name}`}>
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className={styles.foodEmptyState}>
                    <Search size={26} aria-hidden="true" />
                    <strong>No meals found</strong>
                    <span>Add a meal or change the search above.</span>
                  </div>
                )}
              </div>
            </section>
          </section>
        )}

        <div
          className={styles.philWidget}
          style={{ transform: `translate3d(${philPosition.x}px, ${philPosition.y}px, 0)` }}
        >
          {philOpen ? (
            <section className={styles.philPanel} style={philPanelStyle}>
              <div className={styles.philHeader}>
                <div onPointerDown={startPhilDrag} title="Drag Phil">
                  <Bot size={19} aria-hidden="true" />
                  <strong>Phil</strong>
                  <span>Life advisor</span>
                </div>
                <button type="button" onClick={() => setPhilOpen(false)} title="Close Phil">
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div className={styles.philMessages}>
                {philMessages.map((message) => (
                  <p className={message.role === "user" ? styles.philUserMessage : ""} key={message.id}>
                    {message.content}
                  </p>
                ))}
                {philLoading ? <p>Phil is thinking...</p> : null}
              </div>
              <form className={styles.philForm} onSubmit={askPhil}>
                <input
                  value={philInput}
                  onChange={(event) => setPhilInput(event.target.value)}
                  placeholder="Ask about anything in LifeOS..."
                />
                <button type="submit" disabled={philLoading || !philInput.trim()}>
                  <Send size={16} aria-hidden="true" />
                </button>
              </form>
            </section>
          ) : null}
          <button
            className={styles.philButton}
            type="button"
            onPointerDown={startPhilDrag}
            onClick={() => {
              if (philDraggedRef.current) {
                philDraggedRef.current = false;
                return;
              }

              setPhilOpen((current) => !current);
            }}
            title="Ask Phil"
          >
            <Bot size={24} aria-hidden="true" />
            <span>Phil</span>
          </button>
        </div>
      </section>
    </main>
  );
}
