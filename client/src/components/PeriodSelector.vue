<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- Granularity -->
    <select
      v-if="granularities.length > 1"
      v-model="granularity"
      class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <option v-for="g in granularities" :key="g" :value="g">
        {{ granularityLabel(g) }}
      </option>
    </select>

    <!-- Month -->
    <select
      v-if="granularity === 'month'"
      v-model.number="month"
      class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <option v-for="(m, i) in MONTHS" :key="i" :value="i">{{ m }}</option>
    </select>

    <!-- Quarter -->
    <select
      v-if="granularity === 'quarter'"
      v-model.number="quarter"
      class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <option v-for="(q, i) in QUARTERS" :key="i" :value="i">{{ q }}</option>
    </select>

    <!-- Year -->
    <select
      v-model.number="year"
      class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

interface PeriodRange {
  start: string; // YYYY-MM-DD (inclusive)
  end: string; // YYYY-MM-DD (inclusive)
  label: string;
  granularity: string;
}

const props = withDefaults(
  defineProps<{
    // Which granularities to offer, in order. The first is the default.
    granularities?: string[];
  }>(),
  { granularities: () => ["month", "quarter", "year"] },
);

const emit = defineEmits<{ (e: "change", value: PeriodRange): void }>();

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const now = new Date();
const granularity = ref(props.granularities[0] || "month");
const year = ref(now.getFullYear());
const month = ref(now.getMonth()); // 0-11
const quarter = ref(Math.floor(now.getMonth() / 3)); // 0-3

// Current year and a few on either side.
const years = computed(() => {
  const current = now.getFullYear();
  const list: number[] = [];
  for (let y = current + 1; y >= current - 6; y--) list.push(y);
  return list;
});

const granularityLabel = (g: string) => g.charAt(0).toUpperCase() + g.slice(1);

const toStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const range = computed<PeriodRange>(() => {
  if (granularity.value === "year") {
    return {
      start: toStr(new Date(year.value, 0, 1)),
      end: toStr(new Date(year.value, 11, 31)),
      label: `${year.value}`,
      granularity: "year",
    };
  }
  if (granularity.value === "quarter") {
    const startMonth = quarter.value * 3;
    return {
      start: toStr(new Date(year.value, startMonth, 1)),
      end: toStr(new Date(year.value, startMonth + 3, 0)),
      label: `${QUARTERS[quarter.value]} ${year.value}`,
      granularity: "quarter",
    };
  }
  return {
    start: toStr(new Date(year.value, month.value, 1)),
    end: toStr(new Date(year.value, month.value + 1, 0)),
    label: `${MONTHS[month.value]} ${year.value}`,
    granularity: "month",
  };
});

watch(range, (r) => emit("change", r));
onMounted(() => emit("change", range.value));
</script>
