<template>
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm text-center">
            <p class="text-4xl mb-4">⚠️</p>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Delete {{ props.item }}?</h3>
            <p class="text-sm text-gray-400 mb-6">
                This will permanently delete <strong>{{ itemDescription }}</strong>.
            </p>
            <div class="flex gap-3">
                <button
                    @click="emit('close')"
                    class="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                    Cancel                        
                </button>
                <button
                    @click="emit('deleted')"
                    class="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition text-sm"
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

const props = defineProps<{ item: string, itemDescription: string }>();
const emit = defineEmits(['close', 'deleted']);

</script>