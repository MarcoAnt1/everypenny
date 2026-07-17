<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Connections & Sharing</h2>
        <p class="text-sm text-gray-400">
          Invite people, share accounts, and control what each connection can
          see.
        </p>
      </div>

      <!-- Global error -->
      <div
        v-if="errorMessage"
        class="bg-red-50 border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2"
      >
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="ml-auto text-red-400 hover:text-red-600" >✕</button>
      </div>

      <!-- Global success -->
      <div
        v-if="successMessage"
        class="bg-green-50 border-green-200 text-green-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2"
      >
        <span>✅</span>
        <span>{{ successMessage }}</span>
        <button @click="successMessage = ''" class="ml-auto text-green-400 hover:text-green-600" >✕</button>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-800">
          Invite a connection
        </h3>

        <!-- Email -->
        <div class="space-y-3">
          <div>
            <label for="email" class="text-sm text-gray-600 font-medium"
              >Email address</label
            >
            <input
              v-model="inviteForm.inviteeEmail"
              type="email"
              placeholder="friend@example.com"
              class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <!-- Share Options -->
          <div class="grid grid-cols-2 gap-3">
            <!-- Accounts -->
            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input v-model="inviteForm.shareAllAccounts" type="checkbox" />
              Share accounts
            </label>

            <!-- Budgets -->
            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input v-model="inviteForm.shareAllBudgets" type="checkbox" />
              Share budgets
            </label>

            <!-- Categories -->
            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input v-model="inviteForm.shareAllCategories" type="checkbox" />
              Share categories
            </label>

            <!-- Goals -->
            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input v-model="inviteForm.shareAllGoals" type="checkbox" />
              Share goals
            </label>
          </div>

          <button
            @click="inviteConnection"
            class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50 cursor-pointer"
            :disabled="inviting"
          >
            {{ inviting ? "Sending..." : "Send invite" }}
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-800">Share an account</h3>

          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600 font-medium">Account</label>
              <select
                v-model="shareForm.accountId"
                class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="" disabled>Select an account</option>
                <option
                  v-for="account in accounts"
                  :key="account.id"
                  :value="account.id"
                >
                  {{ account.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="text-sm text-gray-600 font-medium"
                >Accepted connection</label
              >
              <select
                v-model="shareForm.userId"
                class="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="" disabled>Select a connection</option>
                <option
                  v-for="connection in acceptedConnections"
                  :key="connection.id"
                  :value="connection.otherUser?.id"
                >
                  {{ connection.otherUser?.name || connection.inviteeEmail }}
                </option>
              </select>
            </div>

            <button
              @click="shareAccountWithConnection"
              class="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition text-sm disabled:opacity-50 cursor-pointer"
              :disabled="sharing"
            >
              {{ sharing ? "Sharing..." : "Share account" }}
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Invites -->
        <div class="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-800">Sent invites</h3>
          <div
            v-if="sentConnections.length === 0"
            class="text-sm text-gray-400"
          >
            No sent invites yet.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="connection in sentConnections"
              :key="connection.id"
              class="border rounded-lg p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-medium text-gray-700">
                    {{ connection.inviteeEmail }}
                  </p>
                  <p class="text-xs text-gray-400">{{ connection.status }}</p>
                </div>
                <button
                  @click="deleteConnection(connection.id)"
                  type="button"
                  class="text-sm text-red-500 hover:text-red-700 cursor-pointer transition ml-auto"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Requests -->
        <div class="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-800">
            Incoming requests
          </h3>
          <div
            v-if="receivedConnections.length === 0"
            class="text-sm text-gray-400"
          >
            No incoming requests.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="connection in receivedConnections"
              :key="connection.id"
              class="border rounded-lg p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-medium text-gray-700">
                    {{ connection.requester?.name || connection.inviteeEmail }}
                  </p>
                  <p class="text-xs text-gray-400">{{ connection.status }}</p>
                </div>
                <button
                  v-if="connection.status === 'PENDING'"
                  @click="acceptConnection(connection.id)"
                  class="text-sm text-emerald-500 hover:text-emerald-700 cursor-pointer transition"
                >
                  Accept
                </button>
                <button
                  v-if="connection.status === 'PENDING'"
                  @click="rejectConnection(connection.id)"
                  class="text-sm text-red-500 hover:text-red-700 cursor-pointer transition"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Connections Accepted -->
    <div class="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <h3 class="text-lg font-semibold text-gray-800">Accepted connections</h3>
      <div
        v-if="acceptedConnections.length === 0"
        class="text-sm text-gray-400"
      >
        No accepted connections yet.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="connection in acceptedConnections"
          :key="connection.id"
          class="border rounded-lg p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-medium text-gray-700">
                {{ connection.otherUser?.name || connection.inviteeEmail }}
              </p>
              <p class="font-medium text-gray-700">
                {{ connection.otherUser?.email || connection.inviteeEmail }}
              </p>
            </div>
            <span
              class="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700"
            >
              Connected
            </span>
          </div>

          <p v-if="!connection.canEditSharing" class="text-xs text-gray-400 mt-3">
            Only the person who sent the invite can change what's shared.
          </p>

          <div
            v-else
            class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3"
          >
            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input
                :checked="connection.shareAllAccounts"
                type="checkbox"
                @change="
                  togglePermission(connection, 'shareAllAccounts', $event)
                "
              />
              Accounts
            </label>

            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input
                :checked="connection.shareAllBudgets"
                type="checkbox"
                @change="
                  togglePermission(connection, 'shareAllBudgets', $event)
                "
              />
              Budgets
            </label>

            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input
                :checked="connection.shareAllCategories"
                type="checkbox"
                @change="
                  togglePermission(connection, 'shareAllCategories', $event)
                "
              />
              Categories
            </label>

            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input
                :checked="connection.shareAllGoals"
                type="checkbox"
                @change="togglePermission(connection, 'shareAllGoals', $event)"
              />
              Goals
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { getAccounts, shareAccount } from "../api/accounts";
import {
  acceptConnection as acceptConnectionApi,
  deleteConnection as deleteConnectionApi,
  inviteConnection as inviteConnectionApi,
  rejectConnection as rejectConnectionApi,
  getConnections,
  updateConnection,
} from "../api/connections";

const authStore = useAuthStore();

const accounts = ref<any[]>([]);
const connectionsSent = ref<any[]>([]);
const connectionsReceived = ref<any[]>([]);
const inviting = ref(false);
const sharing = ref(false);

const errorMessage = ref("");
const successMessage = ref("");

const inviteForm = ref({
  inviteeEmail: "",
  shareAllAccounts: false,
  shareAllBudgets: false,
  shareAllCategories: false,
  shareAllGoals: false,
});

const shareForm = ref({ accountId: "", userId: "" });

const sentConnections = computed(() =>
  connectionsSent.value.filter(
    (conn) => conn.requesterId === authStore.user?.id,
  ),
);

const receivedConnections = computed(() =>
  connectionsReceived.value.filter(
    (conn) => conn.inviteeId === authStore.user?.id,
  ),
);

const acceptedConnections = computed(() =>
  [...connectionsSent.value, ...connectionsReceived.value]
    .filter((conn) => conn.status === "ACCEPTED")
    .map((conn) => ({
      ...conn,
      otherUser:
        conn.requesterId === authStore.user?.id ? conn.invitee : conn.requester,
      // Only the requester may change sharing preferences (enforced by the API).
      canEditSharing: conn.requesterId === authStore.user?.id,
    })),
);

onMounted(async () => {
  await Promise.all([loadAccounts(), loadConnections()]);
});

const loadAccounts = async () => {
  try {
    const response = await getAccounts();
    accounts.value = response.data;
  } catch (err: any) {
    showMessage("error", "Failed to load accounts");
  }
};

const loadConnections = async () => {
  try {
    const response = await getConnections();
    const { sent, received } = response.data;
    connectionsReceived.value = [...received];
    connectionsSent.value = [...sent];
  } catch (err: any) {
    showMessage("error", "Failed to load connections");
  }
};

const inviteConnection = async () => {
  if (!inviteForm.value.inviteeEmail) {
    showMessage("error", "Please enter an email address");
    return;
  }

  inviting.value = true;
  try {
    await inviteConnectionApi(inviteForm.value);
    inviteForm.value = {
      inviteeEmail: "",
      shareAllAccounts: false,
      shareAllBudgets: false,
      shareAllCategories: false,
      shareAllGoals: false,
    };
    await loadConnections();
    showMessage("success", "Invite sent successfully!");
  } catch (err: any) {
    showMessage("error", err.response?.data?.error ?? "Failed to send invite");
  } finally {
    inviting.value = false;
  }
};

const shareAccountWithConnection = async () => {
  if (!shareForm.value.accountId || !shareForm.value.userId) {
    showMessage("error", "Please select an account and a connection");
    return;
  }

  sharing.value = true;
  try {
    await shareAccount(shareForm.value.accountId, shareForm.value.userId);
    shareForm.value = { accountId: "", userId: "" };
    showMessage("success", "Account shared successfully!");
  } catch (err: any) {
    showMessage(
      "error",
      err.response?.data?.error ?? "Failed to share account",
    );
  } finally {
    sharing.value = false;
  }
};

const togglePermission = async (connection: any, key: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  const checked = target.checked;
  const label = key.replace("shareAll", "").toLowerCase();
  const action = checked ? "share" : "stop sharing";

  const confirmed = window.confirm(
    `Are you sure you want to ${action} ${label} with ${connection.otherUser?.name}?`,
  );

  if (!confirmed) {
    target.checked = !checked;
    return;
  }

  try {
    await updateConnection(connection.id, { [key]: target.checked });
    await loadConnections();
    showMessage("success", "Permission updated successfully!");
  } catch (err: any) {
    target.checked = !checked;
    showMessage(
      "error",
      err.response?.data?.error ?? "Failed to update permission",
    );
  }
};

const acceptConnection = async (id: string) => {
  try {
    await acceptConnectionApi(id);
    await loadConnections();
    showMessage("success", "Connection accepted!");
  } catch (err: any) {
    showMessage(
      "error",
      err.response?.data?.error ?? "Failed to accept connection",
    );
  }
};

const rejectConnection = async (id: string) => {
  try {
    await rejectConnectionApi(id);
    await loadConnections();
    showMessage("success", "Connection rejected!");
  } catch (err: any) {
    showMessage(
      "error",
      err.response?.data?.error ?? "Failed to reject connection",
    );
  }
};

const deleteConnection = async (id: string) => {
  const confirmed = window.confirm(
    "Are you sure you want to remove this connection?",
  );
  if (!confirmed) return;

  try {
    await deleteConnectionApi(id);
    await loadConnections();
    showMessage("success", "Connection removed successfully!");
  } catch (err: any) {
    showMessage(
      "error",
      err.response?.data?.error ?? "Failed to remove connection",
    );
  }
};

const showMessage = (type: "success" | "error", message: string) => {
  if (type === "success") {
    successMessage.value = message;
    setTimeout(() => (successMessage.value = ""), 3000);
  } else {
    errorMessage.value = message;
    setTimeout(() => (errorMessage.value = ""), 3000);
  }
};
</script>
