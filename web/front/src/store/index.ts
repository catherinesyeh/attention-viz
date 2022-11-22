import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import * as dataService from "@/services/dataService";
import { TypeOfList } from "underscore";

// init default 
import { Typing } from "@/utils/typing";

export interface State {
  ruleList: Typing.Rule[]
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state: {
    ruleList: [] 
  },
  modules: {
  },
  getters: {
  },
  mutations: {
    setRuleList(state, ruleList: Typing.Rule[]) {
      state.ruleList = ruleList
    }
  },
  actions: {
    async init({ state, commit }) {
      const data = (await dataService.getRuleList()).data;
      commit('setRuleList', data);
    }
  },
  strict: process.env.NODE_ENV !== "production"
});

// define your own `useStore` composition function
export function useStore() {
  return baseUseStore(key)
}