import { action, featureSelector, selector, FeatureModule, createModule } from "@actioncrew/actionstack";

// --- Slice name
export const slice = "messages";

// --- Typed state interface
export interface MessagesState {
  messages: string[];
}

// --- Initial state
export const initialState: MessagesState = {
  messages: [],
};

// --- Action creators with integrated handlers
export const addMessage = action(
  "ADD_MESSAGE",
  (state: MessagesState, { message }: any) => ({
    ...state,
    messages: [...state.messages, message],
  }),
  (message: string) => ({ message })
);

export const clearMessages = action(
  "CLEAR_MESSAGES",
  (state: MessagesState) => ({
    ...state,
    messages: [],
  })
);

// --- Selectors
export const feature = featureSelector<MessagesState>(slice);
export const selectMessages = selector(feature, (state) => state.messages);
export const selectMessageCount = selector(feature, (state) => state.messages.length);

// --- Feature module export
export const messagesModule = createModule({
  slice,
  initialState,
  actions: {
    addMessage,
    clearMessages,
  },
  selectors: {
    selectMessages,
    selectMessageCount,
  },
  dependencies: {

  }
});
