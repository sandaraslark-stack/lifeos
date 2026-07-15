"use client";

import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  Activity,
  Banknote,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coins,
  Compass,
  Database,
  Gamepad2,
  House,
  ImagePlus,
  LayoutDashboard,
  ExternalLink,
  MapPin,
  PiggyBank,
  Plane,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trash2,
  Utensils,
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

type Want = {
  id: string;
  item: string;
  price: number;
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

type IncomeEntry = {
  id: string;
  month: string;
  amount: number;
  source: string;
  notes: string;
  recordedAt: string;
};

type EmergencyFund = {
  balance: number;
  monthlyEssentials: number;
  targetMonths: number;
};

type MoveOutItem = {
  id: string;
  name: string;
  estimatedCost: number;
  completed: boolean;
  productUrl?: string;
  imageUrl?: string;
};

type LifeOSState = {
  incomeHistory: IncomeEntry[];
  emergencyFund: EmergencyFund;
  moveOutItems: MoveOutItem[];
  categories: Category[];
  obligations: Obligation[];
  trips: Trip[];
  wants: Want[];
  wantAllocationCategoryId: string;
  meals: MealPlan[];
  mealCatalog: MealCatalogItem[];
};

type ActiveTab = "overview" | "budget" | "readiness" | "travel" | "food";
type BudgetTab = "allocations" | "obligations" | "wants";
type OverviewTab = "main" | "income-trend";
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
  incomeHistory: [],
  emergencyFund: {
    balance: 0,
    monthlyEssentials: 45000,
    targetMonths: 6,
  },
  moveOutItems: [
    { id: "rent-advance", name: "3 months rent advance", estimatedCost: 84000, completed: false },
    { id: "refrigerator", name: "Refrigerator", estimatedCost: 18000, completed: false },
    { id: "bed", name: "Bed and mattress", estimatedCost: 16000, completed: false },
    { id: "cooking", name: "Cooking essentials", estimatedCost: 8000, completed: false },
  ],
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
  wants: [
    {
      id: "steam-deck",
      item: "Steam Deck",
      price: 35000,
    },
  ],
  wantAllocationCategoryId: "spending",
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

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    new Date(year, monthNumber - 1, 1),
  );
}

function isBetween(day: string, start: string, end: string) {
  return compareDateStrings(day, start) >= 0 && compareDateStrings(day, end) <= 0;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function safeExternalUrl(value?: string) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeLifeOSState(
  state: Partial<LifeOSState> & {
    purchaseGoals?: Want[];
    stash?: number;
    stashHistory?: Array<{ id: string; month: string; amount: number; recordedAt: string }>;
    buyingPowerPercent?: number;
  },
): LifeOSState {
  return {
    incomeHistory: state.incomeHistory ?? defaultState.incomeHistory,
    emergencyFund: { ...defaultState.emergencyFund, ...state.emergencyFund },
    moveOutItems: state.moveOutItems ?? defaultState.moveOutItems,
    categories: state.categories ?? defaultState.categories,
    obligations: state.obligations ?? defaultState.obligations,
    trips: state.trips ?? defaultState.trips,
    wants: (state.wants ?? state.purchaseGoals ?? defaultState.wants).map((want) => ({
      id: want.id,
      item: want.item,
      price: want.price,
    })),
    wantAllocationCategoryId: state.wantAllocationCategoryId ?? defaultState.wantAllocationCategoryId,
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

function createPhilStateSnapshot(state: LifeOSState) {
  return {
    ...state,
    trips: state.trips.map((trip) => ({
      ...trip,
      imageUrl: trip.imageUrl
        ? trip.imageUrl.startsWith("data:")
          ? "Uploaded picture saved"
          : trip.imageUrl.slice(0, 180)
        : undefined,
    })),
  };
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function searchScore(search: string, meal: MealCatalogItem) {
  if (!search) {
    return 1;
  }

  const name = normalizeSearchText(meal.name);
  const notes = normalizeSearchText(meal.notes);
  const words = search.split(" ").filter(Boolean);

  if (name === search) {
    return 100;
  }

  if (name.startsWith(search)) {
    return 90;
  }

  if (name.split(" ").some((word) => word.startsWith(search))) {
    return 78;
  }

  if (name.includes(search)) {
    return 68;
  }

  const wordMatches = words.filter((word) => name.includes(word) || notes.includes(word)).length;

  if (wordMatches) {
    return 45 + wordMatches * 8;
  }

  return 0;
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
  const [activeOverviewTab, setActiveOverviewTab] = useState<OverviewTab>("main");
  const [activeBudgetTab, setActiveBudgetTab] = useState<BudgetTab>("allocations");
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>("wealth");
  const [incomeDraft, setIncomeDraft] = useState({ amount: "", source: "Primary income", notes: "" });
  const [moveOutDraft, setMoveOutDraft] = useState({
    name: "",
    estimatedCost: "",
    productUrl: "",
    imageUrl: "",
  });
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
      content: "I am Phil, your LifeOS advisor. Ask me anything about your income, emergency fund, move-out plan, bills, trips, food, or wants.",
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

  function saveMonthlyIncome() {
    const amount = Number(incomeDraft.amount);
    const currentMonth = monthInputValue(new Date());

    if (!Number.isFinite(amount) || amount <= 0 || !incomeDraft.source.trim()) {
      return;
    }

    setState((current) => {
      if (current.incomeHistory.some((entry) => entry.month === currentMonth)) {
        return current;
      }

      return {
        ...current,
        incomeHistory: [
          ...current.incomeHistory,
          {
            id: createId("income"),
            month: currentMonth,
            amount,
            source: incomeDraft.source.trim(),
            notes: incomeDraft.notes.trim(),
            recordedAt: new Date().toISOString(),
          },
        ],
      };
    });
  }

  function addMoveOutItem() {
    if (!moveOutDraft.name.trim()) {
      return;
    }

    setState((current) => ({
      ...current,
      moveOutItems: [
        ...current.moveOutItems,
        {
          id: createId("moveout"),
          name: moveOutDraft.name.trim(),
          estimatedCost: Math.max(0, Number(moveOutDraft.estimatedCost) || 0),
          completed: false,
          productUrl: moveOutDraft.productUrl.trim() || undefined,
          imageUrl: moveOutDraft.imageUrl.trim() || undefined,
        },
      ],
    }));
    setMoveOutDraft({ name: "", estimatedCost: "", productUrl: "", imageUrl: "" });
  }

  function updateMoveOutItem(id: string, patch: Partial<MoveOutItem>) {
    setState((current) => ({
      ...current,
      moveOutItems: current.moveOutItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function deleteMoveOutItem(id: string) {
    setState((current) => ({
      ...current,
      moveOutItems: current.moveOutItems.filter((item) => item.id !== id),
    }));
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

  const currentMonthKey = monthInputValue(now);
  const incomeHistory = state.incomeHistory.toSorted((a, b) => a.month.localeCompare(b.month));
  const currentMonthIncomeEntry = incomeHistory.find((entry) => entry.month === currentMonthKey);
  const latestIncomeEntry = incomeHistory.at(-1);
  const previousIncomeEntry = incomeHistory.at(-2);
  const monthlyIncome = currentMonthIncomeEntry?.amount ?? latestIncomeEntry?.amount ?? 0;
  const previousIncome = previousIncomeEntry?.amount ?? monthlyIncome;
  const incomeDelta = latestIncomeEntry && previousIncomeEntry ? latestIncomeEntry.amount - previousIncome : 0;
  const incomeTrend =
    incomeHistory.length < 2 ? "Building your baseline" : incomeDelta > 0 ? "Income is growing" : incomeDelta < 0 ? "Income moved lower" : "Income is steady";
  const incomeTrendTone = incomeDelta > 0 ? "good" : incomeDelta < 0 ? "warn" : "steady";
  const incomeChanges = incomeHistory.slice(1).map((entry, index) => entry.amount - incomeHistory[index].amount);
  const averageIncomeChange =
    incomeChanges.length > 0
      ? incomeChanges.reduce((sum, change) => sum + change, 0) / incomeChanges.length
      : 0;
  const incomeHigh = incomeHistory.length ? Math.max(...incomeHistory.map((entry) => entry.amount)) : 0;
  const incomeLow = incomeHistory.length ? Math.min(...incomeHistory.map((entry) => entry.amount)) : 0;
  const incomeRange = Math.max(incomeHigh - incomeLow, 1);
  const recentIncomeHistory = incomeHistory.slice(-12);
  const incomeCurvePoints = recentIncomeHistory
    .map((entry, index) => {
      const x = recentIncomeHistory.length === 1 ? 500 : 36 + (index / (recentIncomeHistory.length - 1)) * 928;
      const y = 244 - ((entry.amount - incomeLow) / incomeRange) * 196;
      return `${x},${y}`;
    })
    .join(" ");
  const canSaveMonthlyIncome = !currentMonthIncomeEntry && Number(incomeDraft.amount) > 0 && Boolean(incomeDraft.source.trim());

  const categoryTotal = state.categories.reduce((sum, category) => sum + category.percent, 0);
  const monthlyCategory = state.categories.find((category) => category.id === "monthly");
  const wantAllocationCategory =
    state.categories.find((category) => category.id === state.wantAllocationCategoryId) ??
    state.categories.find(
      (category) => category.id === "spending" || category.name.toLowerCase() === "guilt-free spending",
    ) ??
    state.categories[0];
  const monthlyEnvelope = monthlyIncome * ((monthlyCategory?.percent ?? 0) / 100);
  const wantAllocationAmount = monthlyIncome * ((wantAllocationCategory?.percent ?? 0) / 100);
  const wantsTotal = state.wants.reduce((sum, want) => sum + want.price, 0);

  const monthlyDue = state.obligations.reduce((sum, obligation) => {
    const remaining = remainingMonths(obligation);
    return sum + (obligation.kind === "fixed" || remaining > 0 ? obligation.amount : 0);
  }, 0);
  const monthlyRemaining = monthlyEnvelope - monthlyDue;
  const emergencyTarget = state.emergencyFund.monthlyEssentials * state.emergencyFund.targetMonths;
  const emergencyProgress = Math.min((state.emergencyFund.balance / Math.max(emergencyTarget, 1)) * 100, 100);
  const emergencyMonthsCovered = state.emergencyFund.balance / Math.max(state.emergencyFund.monthlyEssentials, 1);
  const completedMoveOutItems = state.moveOutItems.filter((item) => item.completed).length;
  const moveOutTotal = state.moveOutItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  const moveOutReadyTotal = state.moveOutItems
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.estimatedCost, 0);
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
  const todayDate = dateInputValue(now);

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
    const search = normalizeSearchText(mealSearch);

    return state.mealCatalog
      .map((meal) => ({ meal, score: searchScore(search, meal) }))
      .filter(({ score }) => score > 0)
      .toSorted((a, b) => b.score - a.score || a.meal.name.localeCompare(b.meal.name))
      .map(({ meal }) => meal);
  }, [mealSearch, state.mealCatalog]);

  const smartMealSuggestions = filteredMealCatalog.slice(0, 5);
  const canAddMealSearch =
    Boolean(mealSearch.trim()) &&
    !state.mealCatalog.some(
      (meal) => normalizeSearchText(meal.name) === normalizeSearchText(mealSearch),
    );

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

  function applyMealToDraft(name: string, notes = "") {
    setMealDraft({
      food: name,
      notes,
    });
    setMealSearch(name);
  }

  function applyMealFromCatalog(meal: MealCatalogItem) {
    applyMealToDraft(meal.name, meal.notes);
  }

  function addSearchMealToCatalog() {
    const name = mealSearch.trim();

    if (!name) {
      return;
    }

    setState((current) => {
      const existing = current.mealCatalog.find((meal) => normalizeSearchText(meal.name) === normalizeSearchText(name));

      if (existing) {
        return current;
      }

      return {
        ...current,
        mealCatalog: [
          ...current.mealCatalog,
          {
            id: createId("meal-catalog"),
            name,
            notes: "",
          },
        ],
      };
    });
    applyMealToDraft(name);
  }

  function clearMealSearch() {
    setMealSearch("");
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
          state: createPhilStateSnapshot(state),
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

  function updateWant(id: string, patch: Partial<Want>) {
    setState((current) => ({
      ...current,
      wants: current.wants.map((want) => (want.id === id ? { ...want, ...patch } : want)),
    }));
  }

  function updateWantAllocationCategory(categoryId: string) {
    setState((current) => ({
      ...current,
      wantAllocationCategoryId: categoryId,
    }));
  }

  function moveWant(id: string, direction: -1 | 1) {
    setState((current) => {
      const currentIndex = current.wants.findIndex((want) => want.id === id);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.wants.length) {
        return current;
      }

      const wants = [...current.wants];
      [wants[currentIndex], wants[nextIndex]] = [wants[nextIndex], wants[currentIndex]];

      return {
        ...current,
        wants,
      };
    });
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

  function addWant() {
    setState((current) => ({
      ...current,
      wants: [
        ...current.wants,
        {
          id: createId("want"),
          item: "New want",
          price: 10000,
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
              <span />
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
              className={activeTab === "readiness" ? styles.activeTab : ""}
              type="button"
              onClick={() => setActiveTab("readiness")}
            >
              <House size={17} aria-hidden="true" />
              Readiness
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
            className={activeTab === "readiness" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveTab("readiness")}
          >
            <House size={17} aria-hidden="true" />
            Readiness
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
          <nav className={styles.overviewTabs} aria-label="Money cockpit views">
            <button
              className={activeOverviewTab === "main" ? styles.activeOverviewTab : ""}
              type="button"
              onClick={() => setActiveOverviewTab("main")}
            >
              <LayoutDashboard size={16} aria-hidden="true" />
              Main
            </button>
            <button
              className={activeOverviewTab === "income-trend" ? styles.activeOverviewTab : ""}
              type="button"
              onClick={() => setActiveOverviewTab("income-trend")}
            >
              <TrendingUp size={16} aria-hidden="true" />
              Income Curve
            </button>
          </nav>

          {activeOverviewTab === "main" ? (
            <>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>
                  <Activity size={15} aria-hidden="true" />
                  Realtime analytics
                </p>
                <h1>{liveMonth} money cockpit</h1>
                <p className={styles.heroSubcopy}>
                  One truthful income record per month, locked after saving for a clean financial history.
                </p>
                <div className={styles.incomeIntegrityCard}>
                  <ShieldCheck size={24} aria-hidden="true" />
                  <div>
                    <span>Monthly integrity rule</span>
                    <strong>{currentMonthIncomeEntry ? "Income locked" : "Ready for your entry"}</strong>
                    <small>{formatMonthLabel(currentMonthKey)} · one save only</small>
                  </div>
                </div>
              </div>

              <div className={styles.analyticsBoard}>
                <div className={styles.liveBadge}>
                  <Sparkles size={15} aria-hidden="true" />
                  Updated {liveTime}
                </div>
                <div className={styles.incomeEntryForm}>
                  <label>
                    <span>Income received</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="₱0"
                      value={currentMonthIncomeEntry?.amount ?? incomeDraft.amount}
                      disabled={Boolean(currentMonthIncomeEntry)}
                      onChange={(event) => setIncomeDraft((current) => ({ ...current, amount: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Income source</span>
                    <input
                      value={currentMonthIncomeEntry?.source ?? incomeDraft.source}
                      disabled={Boolean(currentMonthIncomeEntry)}
                      onChange={(event) => setIncomeDraft((current) => ({ ...current, source: event.target.value }))}
                    />
                  </label>
                  <label className={styles.incomeNotesField}>
                    <span>Note (optional)</span>
                    <input
                      placeholder="Salary, client payout, business draw…"
                      value={currentMonthIncomeEntry?.notes ?? incomeDraft.notes}
                      disabled={Boolean(currentMonthIncomeEntry)}
                      onChange={(event) => setIncomeDraft((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </label>
                  <button
                    className={styles.monthlyStashButton}
                    type="button"
                    disabled={!canSaveMonthlyIncome}
                    onClick={saveMonthlyIncome}
                  >
                    {currentMonthIncomeEntry ? <Check size={16} aria-hidden="true" /> : null}
                    {currentMonthIncomeEntry ? "Recorded — locked" : `Record ${formatMonthLabel(currentMonthKey)} income`}
                  </button>
                </div>
                <div className={styles.analyticsGrid}>
                  <article className={styles.analyticsPrimary}>
                    <span>Current monthly income</span>
                    <strong>{currency.format(monthlyIncome)}</strong>
                    <p>
                      {currentMonthIncomeEntry
                        ? `Locked for ${formatMonthLabel(currentMonthKey)}`
                        : "Awaiting this month record"}
                    </p>
                  </article>
                  <article className={styles.analyticsPrimary}>
                    <span>Emergency fund</span>
                    <strong>{currency.format(state.emergencyFund.balance)}</strong>
                    <p>{emergencyMonthsCovered.toFixed(1)} months of essentials covered</p>
                  </article>
                  <article>
                    <House size={18} aria-hidden="true" />
                    <span>Move-out ready</span>
                    <strong>{completedMoveOutItems}/{state.moveOutItems.length}</strong>
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
            </>
          ) : (
            <section className={styles.stashTrendPanel}>
              <div className={styles.stashTrendHead}>
                <div>
                  <p className={styles.eyebrow}>
                    <Activity size={15} aria-hidden="true" />
                    Verified monthly income
                  </p>
                  <h2>{incomeTrend}</h2>
                  <p>
                    {incomeHistory.length < 2
                      ? "Record at least two months to unlock a reliable trend."
                      : `Latest movement is ${currency.format(incomeDelta)} from ${formatMonthLabel(
                          previousIncomeEntry?.month ?? currentMonthKey,
                        )}.`}
                  </p>
                </div>
                <div className={[styles.trendSignal, styles[incomeTrendTone]].join(" ")}>
                  {incomeDelta < 0 ? <TrendingDown size={24} aria-hidden="true" /> : <TrendingUp size={24} aria-hidden="true" />}
                  <strong>{currency.format(incomeDelta)}</strong>
                  <span>latest change</span>
                </div>
              </div>

              <div className={styles.stashTrendStats}>
                <article>
                  <span>Latest income</span>
                  <strong>{currency.format(monthlyIncome)}</strong>
                  <p>{currentMonthIncomeEntry ? "This month is locked" : "This month can still be recorded"}</p>
                </article>
                <article>
                  <span>Average change</span>
                  <strong className={averageIncomeChange >= 0 ? styles.good : styles.warn}>
                    {currency.format(averageIncomeChange)}
                  </strong>
                  <p>Average month-to-month move</p>
                </article>
                <article>
                  <span>Highest month</span>
                  <strong>{currency.format(incomeHigh)}</strong>
                  <p>Highest logged income</p>
                </article>
                <article>
                  <span>Lowest month</span>
                  <strong>{currency.format(incomeLow)}</strong>
                  <p>Lowest logged income</p>
                </article>
              </div>

              <div className={styles.incomeCurve}>
                {recentIncomeHistory.length ? (
                  <>
                    <svg viewBox="0 0 1000 280" role="img" aria-label="Monthly income curve">
                      <defs>
                        <linearGradient id="income-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={`M ${incomeCurvePoints} L 964,264 L 36,264 Z`} fill="url(#income-area)" />
                      <polyline points={incomeCurvePoints} fill="none" stroke="#0284c7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                      {recentIncomeHistory.map((entry, index) => {
                        const x = recentIncomeHistory.length === 1 ? 500 : 36 + (index / (recentIncomeHistory.length - 1)) * 928;
                        const y = 244 - ((entry.amount - incomeLow) / incomeRange) * 196;
                        return <circle key={entry.id} cx={x} cy={y} r="10" fill="#ffffff" stroke="#0284c7" strokeWidth="6"><title>{`${formatMonthLabel(entry.month)}: ${currency.format(entry.amount)}`}</title></circle>;
                      })}
                    </svg>
                    <div className={styles.incomeCurveLabels}>
                      {recentIncomeHistory.map((entry) => <span key={entry.id}>{formatMonthLabel(entry.month)}</span>)}
                    </div>
                  </>
                ) : (
                  <p>No income records yet. Your first point appears after this month’s income is locked.</p>
                )}
              </div>
            </section>
          )}
        </section>

        {activeTab === "overview" && (
          <section className={styles.workspace}>
            <div className={styles.metricGrid}>
              <article className={styles.metricCard}>
                <Banknote size={22} aria-hidden="true" />
                <span>Verified income</span>
                <strong>{currency.format(monthlyIncome)}</strong>
                <p>{currentMonthIncomeEntry ? "Locked for this month." : "Waiting for this month’s record."}</p>
              </article>
              <article className={styles.metricCard}>
                <ShieldCheck size={22} aria-hidden="true" />
                <span>Emergency coverage</span>
                <strong>{emergencyMonthsCovered.toFixed(1)} months</strong>
                <p>{currency.format(state.emergencyFund.balance)} currently protected.</p>
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
                    <p>How your verified monthly income is divided across your current money system.</p>
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
                    <h2>Income Shape</h2>
                    <p>Verified income, planned allocations, and current bills pressure.</p>
                  </div>
                </div>
                <div className={styles.cashflowBars}>
                  <div>
                    <span>Verified income</span>
                    <strong>{currency.format(monthlyIncome)}</strong>
                    <i style={{ width: "100%" }} />
                  </div>
                  <div>
                    <span>Allocations mapped</span>
                    <strong>{currency.format(monthlyIncome * Math.min(categoryTotal / 100, 1))}</strong>
                    <i style={{ width: `${Math.min(categoryTotal, 100)}%` }} />
                  </div>
                  <div>
                    <span>Obligations used</span>
                    <strong>{currency.format(monthlyDue)}</strong>
                    <i style={{ width: `${Math.min((monthlyDue / Math.max(monthlyIncome, 1)) * 100, 100)}%` }} />
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

        {activeTab === "readiness" && (
          <section className={styles.readinessWorkspace}>
            <section className={styles.emergencyPanel}>
              <div className={styles.panelTitle}>
                <ShieldCheck size={22} aria-hidden="true" />
                <div>
                  <h2>Emergency Fund</h2>
                  <p>See exactly how many months of essential expenses you can cover.</p>
                </div>
              </div>
              <div className={styles.emergencyStatus}>
                <div className={styles.emergencyGauge} style={{ "--progress": `${emergencyProgress}%` } as CSSProperties}>
                  <strong>{Math.round(emergencyProgress)}%</strong>
                  <span>funded</span>
                </div>
                <div>
                  <span className={styles.statusPill}>
                    {state.emergencyFund.balance > 0 ? <CheckCircle2 size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}
                    {state.emergencyFund.balance > 0 ? "Emergency fund started" : "No emergency fund yet"}
                  </span>
                  <h3>{emergencyMonthsCovered.toFixed(1)} months covered</h3>
                  <p>{currency.format(state.emergencyFund.balance)} of {currency.format(emergencyTarget)} target</p>
                  <div className={styles.progressTrack}><i style={{ width: `${emergencyProgress}%` }} /></div>
                </div>
              </div>
              <div className={styles.emergencyInputs}>
                <label>
                  <span>Current emergency balance</span>
                  <input type="number" min="0" value={state.emergencyFund.balance} onChange={(event) => setState((current) => ({ ...current, emergencyFund: { ...current.emergencyFund, balance: Math.max(0, Number(event.target.value)) } }))} />
                </label>
                <label>
                  <span>Monthly essential expenses</span>
                  <input type="number" min="1" value={state.emergencyFund.monthlyEssentials} onChange={(event) => setState((current) => ({ ...current, emergencyFund: { ...current.emergencyFund, monthlyEssentials: Math.max(1, Number(event.target.value)) } }))} />
                </label>
                <label>
                  <span>Target months</span>
                  <input type="number" min="1" max="24" value={state.emergencyFund.targetMonths} onChange={(event) => setState((current) => ({ ...current, emergencyFund: { ...current.emergencyFund, targetMonths: Math.max(1, Math.min(24, Number(event.target.value))) } }))} />
                </label>
              </div>
            </section>

            <section className={styles.moveOutPanel}>
              <div className={styles.moveOutHeader}>
                <div className={styles.panelTitle}>
                  <House size={22} aria-hidden="true" />
                  <div>
                    <h2>Move-out Checklist</h2>
                    <p>Edit the essentials, attach products, and mark each item ready.</p>
                  </div>
                </div>
                <div className={styles.moveOutSummary}>
                  <strong>{completedMoveOutItems}/{state.moveOutItems.length}</strong>
                  <span>ready · {currency.format(moveOutReadyTotal)} of {currency.format(moveOutTotal)}</span>
                </div>
              </div>

              <div className={styles.moveOutForm}>
                <input placeholder="Item or requirement" value={moveOutDraft.name} onChange={(event) => setMoveOutDraft((current) => ({ ...current, name: event.target.value }))} />
                <input type="number" min="0" placeholder="Estimated cost" value={moveOutDraft.estimatedCost} onChange={(event) => setMoveOutDraft((current) => ({ ...current, estimatedCost: event.target.value }))} />
                <input type="url" placeholder="Product link (optional)" value={moveOutDraft.productUrl} onChange={(event) => setMoveOutDraft((current) => ({ ...current, productUrl: event.target.value }))} />
                <input placeholder="Image URL (optional)" value={moveOutDraft.imageUrl} onChange={(event) => setMoveOutDraft((current) => ({ ...current, imageUrl: event.target.value }))} />
                <label className={styles.imageUploadButton}>
                  <ImagePlus size={17} aria-hidden="true" />
                  Upload image
                  <input type="file" accept="image/*" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) readImageFile(file, (imageUrl) => setMoveOutDraft((current) => ({ ...current, imageUrl })));
                  }} />
                </label>
                <button type="button" className={styles.primaryButton} disabled={!moveOutDraft.name.trim()} onClick={addMoveOutItem}>
                  <Plus size={17} aria-hidden="true" /> Add item
                </button>
              </div>

              <div className={styles.moveOutList}>
                {state.moveOutItems.map((item) => {
                  const productUrl = safeExternalUrl(item.productUrl);
                  return (
                    <article className={[styles.moveOutItem, item.completed ? styles.moveOutItemDone : ""].join(" ")} key={item.id}>
                      <button className={styles.checkButton} type="button" aria-label={item.completed ? `Mark ${item.name} incomplete` : `Mark ${item.name} complete`} onClick={() => updateMoveOutItem(item.id, { completed: !item.completed })}>
                        {item.completed ? <CheckCircle2 size={24} aria-hidden="true" /> : <span />}
                      </button>
                      <div className={styles.moveOutImage} style={item.imageUrl ? { backgroundImage: `url(${JSON.stringify(item.imageUrl)})` } : undefined}>
                        {!item.imageUrl ? <House size={22} aria-hidden="true" /> : null}
                      </div>
                      <div className={styles.moveOutFields}>
                        <input aria-label="Item name" value={item.name} onChange={(event) => updateMoveOutItem(item.id, { name: event.target.value })} />
                        <div>
                          <input aria-label="Estimated cost" type="number" min="0" value={item.estimatedCost} onChange={(event) => updateMoveOutItem(item.id, { estimatedCost: Math.max(0, Number(event.target.value)) })} />
                          <input aria-label="Product link" type="url" placeholder="Product link" value={item.productUrl ?? ""} onChange={(event) => updateMoveOutItem(item.id, { productUrl: event.target.value })} />
                          <input aria-label="Image URL" placeholder="Image URL" value={item.imageUrl?.startsWith("data:") ? "Uploaded image" : item.imageUrl ?? ""} disabled={item.imageUrl?.startsWith("data:")} onChange={(event) => updateMoveOutItem(item.id, { imageUrl: event.target.value })} />
                        </div>
                      </div>
                      <div className={styles.moveOutActions}>
                        {productUrl ? <a href={productUrl} target="_blank" rel="noreferrer" aria-label={`Open product for ${item.name}`}><ExternalLink size={17} aria-hidden="true" /></a> : null}
                        <label aria-label={`Upload image for ${item.name}`}><ImagePlus size={17} aria-hidden="true" /><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) readImageFile(file, (imageUrl) => updateMoveOutItem(item.id, { imageUrl })); }} /></label>
                        <button type="button" aria-label={`Delete ${item.name}`} onClick={() => deleteMoveOutItem(item.id)}><Trash2 size={17} aria-hidden="true" /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
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
                className={activeBudgetTab === "wants" ? styles.activeSubTab : ""}
                type="button"
                onClick={() => setActiveBudgetTab("wants")}
              >
                <Gamepad2 size={16} aria-hidden="true" />
                Wants
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
                    const allocation = monthlyIncome * (category.percent / 100);
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

            {activeBudgetTab === "wants" && (
              <article className={`${styles.widePanel} ${styles.purchasePanel}`}>
                <div className={styles.sectionHead}>
                  <div className={styles.panelTitle}>
                    <Gamepad2 size={20} aria-hidden="true" />
                    <div>
                      <h2>Wants</h2>
                      <p>Stack what you want and check it against the allocation you choose.</p>
                    </div>
                  </div>
                  <button className={styles.iconButton} type="button" onClick={addWant} title="Add want">
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className={styles.wantSummary}>
                  <div>
                    <span>Allocation source</span>
                    <select
                      aria-label="Wants allocation source"
                      value={wantAllocationCategory?.id ?? ""}
                      onChange={(event) => updateWantAllocationCategory(event.target.value)}
                    >
                      {state.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <strong>{currency.format(wantAllocationAmount)}</strong>
                  </div>
                  <div>
                    <span>Wants stacked</span>
                    <strong>{currency.format(wantsTotal)}</strong>
                  </div>
                  <div>
                    <span>After full stack</span>
                    <strong className={wantAllocationAmount - wantsTotal >= 0 ? styles.good : styles.warn}>
                      {currency.format(wantAllocationAmount - wantsTotal)}
                    </strong>
                  </div>
                </div>

                <div className={styles.purchaseList}>
                  {state.wants.map((want, index) => {
                    const stackCost = state.wants
                      .slice(0, index + 1)
                      .reduce((sum, stackedWant) => sum + stackedWant.price, 0);
                    const stackRemaining = wantAllocationAmount - stackCost;
                    const isSafe = stackRemaining >= 0;
                    const progress = Math.min((stackCost / Math.max(wantAllocationAmount, 1)) * 100, 100);

                    return (
                      <div className={styles.purchaseCard} key={want.id}>
                        <div className={styles.purchaseTop}>
                          <div className={styles.purchaseIcon}>
                            <span>{index + 1}</span>
                          </div>
                          <div>
                            <input
                              aria-label="Want name"
                              value={want.item}
                              onChange={(event) => updateWant(want.id, { item: event.target.value })}
                            />
                            <span>{currency.format(want.price)} price</span>
                          </div>
                          <button
                            className={styles.ghostIcon}
                            type="button"
                            title="Remove want"
                            onClick={() =>
                              setState((current) => ({
                                ...current,
                                wants: current.wants.filter((item) => item.id !== want.id),
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
                              value={want.price}
                              onChange={(event) => updateWant(want.id, { price: Number(event.target.value) })}
                            />
                          </label>
                          <div className={styles.stackControls} aria-label="Rearrange want stack">
                            <button
                              type="button"
                              title="Move up"
                              disabled={index === 0}
                              onClick={() => moveWant(want.id, -1)}
                            >
                              <ChevronUp size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              title="Move down"
                              disabled={index === state.wants.length - 1}
                              onClick={() => moveWant(want.id, 1)}
                            >
                              <ChevronDown size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div className={styles.purchaseStats}>
                          <div>
                            <span>Stack cost</span>
                            <strong>{currency.format(stackCost)}</strong>
                          </div>
                          <div>
                            <span>{wantAllocationCategory?.name ?? "Allocation"} left</span>
                            <strong className={isSafe ? styles.good : styles.warn}>
                              {currency.format(stackRemaining)}
                            </strong>
                          </div>
                          <div>
                            <span>Status</span>
                            <strong className={isSafe ? styles.safePill : styles.notSafePill}>
                              {isSafe ? "Can buy" : "Not yet"}
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
                    const isToday = date === todayDate;

                    return (
                      <div
                        className={[styles.foodDay, isToday ? styles.todayFoodDay : ""].join(" ")}
                        key={date}
                        aria-current={isToday ? "date" : undefined}
                      >
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
                    {mealSearch ? (
                      <button type="button" onClick={clearMealSearch} title="Clear search">
                        <X size={15} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </label>

                {mealSearch.trim() ? (
                  <div className={styles.smartMealSuggestions}>
                    {smartMealSuggestions.length ? (
                      smartMealSuggestions.map((meal) => (
                        <button type="button" key={meal.id} onClick={() => applyMealFromCatalog(meal)}>
                          <strong>{meal.name}</strong>
                          <span>{meal.notes || "Use this meal"}</span>
                        </button>
                      ))
                    ) : (
                      <p>No saved meal yet for {mealSearch.trim()}.</p>
                    )}
                    {canAddMealSearch ? (
                      <button className={styles.addSearchMealButton} type="button" onClick={addSearchMealToCatalog}>
                        <Plus size={15} aria-hidden="true" />
                        Add {mealSearch.trim()} and use it
                      </button>
                    ) : null}
                  </div>
                ) : null}

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
                          onClick={() => applyMealToDraft(food)}
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
