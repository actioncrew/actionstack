import { Action, action, featureSelector, selector } from "@actioncrew/actionstack";

export const slice = "messages";

// Define the actions using action
export const addMessage = action("ADD_MESSAGE", (message: string) => ({ message }));
export const clearMessages = action('CLEAR_MESSAGES');

// Define the initial state
const initialState = {
  messages: []
};

export function reducer(state = initialState, action: Action<any>) {
  switch (action.type) {
    case addMessage.type:
      return {
        ...state,
        messages: [...state.messages, action.payload.message]
      };
    case clearMessages.type:
      return {
        ...state,
        messages: []
      };
    default:
      return state;
  }
}

export const feature = featureSelector(slice);
export const selectMessages = selector(feature, state => state.messages);
export const selectMessageCount = selector(feature, state => state.messages.length);

