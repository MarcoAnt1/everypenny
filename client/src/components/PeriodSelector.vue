<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- Granularity -->
    <Dropdown
      v-if="granularities.length > 1"
      v-model="granularity"
      :options="granularityOptions"
      class="w-32"
    />

    <!-- Month -->
    <Dropdown
      v-if="granularity === 'month'"
      :model-value="String(month)"
      :options="monthOptions"
      class="w-36"
      @update:model-value="(v) => (month = Number(v))"
    />

    <!-- Quarter -->
    <Dropdown
      v-if="granularity === 'quarter'"
      :model-value="String(quarter)"
      :options="quarterOptions"
      class="w-24"
      @update:model-value="(v) => (quarter = Number(v))"
    />

    <!-- Year -->
    <Dropdown
      :model-value="String(year)"
      :options="yearOptions"
      class="w-28"
      @update:model-value="(v) => (year = Number(v))"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import Dropdown from "./Dropdown.vue";

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

const granularityOptions = computed(() =>
  props.granularities.map((g) => ({ value: g, label: granularityLabel(g) })),
);
const monthOptions = MONTHS.map((m, i) => ({ value: String(i), label: m }));
const quarterOptions = QUARTERS.map((q, i) => ({ value: String(i), label: q }));
const yearOptions = computed(() =>
  years.value.map((y) => ({ value: String(y), label: String(y) })),
);

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
