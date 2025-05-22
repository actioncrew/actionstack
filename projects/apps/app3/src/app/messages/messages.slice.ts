import { action, featureSelector, selector } from "@actioncrew/actionstack";

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

// --- Action handlers (no reducer needed)
const actionHandlers = {
  ADD_MESSAGE: (state: MessagesState, { message }: { message: string }) => ({
    ...state,
    messages: [...state.messages, message],
  }),
  CLEAR_MESSAGES: (state: MessagesState) => ({
    ...state,
    messages: [],
  }),
};

// --- Action creators with integrated handlers
export const addMessage = action("ADD_MESSAGE", actionHandlers.ADD_MESSAGE);
export const clearMessages = action("CLEAR_MESSAGES", actionHandlers.CLEAR_MESSAGES);

// --- Selectors
export const feature = featureSelector<MessagesState>(slice);
export const selectMessages = selector(feature, (state) => state.messages);
export const selectMessageCount = selector(feature, (state) => state.messages.length);

// --- Feature module export
export const messagesModule = {
  name: slice,
  initialState,
  actionHandlers,
  actions: {
    addMessage,
    clearMessages,
  },
  selectors: {
    selectMessages,
    selectMessageCount,
  },
};
