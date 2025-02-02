import { createSlice } from '@reduxjs/toolkit'

const UsersSlice = createSlice({
    name: "Users",
    initialState: {
        /**
         * Set of known pubkeys
         */
        pubKeys: [],

        /**
         * User objects for known pubKeys, populated async
         */
        users: {}
    },
    reducers: {
        addPubKey: (state, action) => {
            let keys = action.payload;
            if (!Array.isArray(keys)) {
                keys = [keys];
            }
            let temp = new Set(state.pubKeys);
            for (let k of keys) {
                temp.add(k);

                // load from cache
                let cache = window.localStorage.getItem(`user:${k}`);
                if (cache) {
                    let ud = JSON.parse(cache);
                    state.users[ud.pubkey] = ud;
                }
            }
            state.pubKeys = Array.from(temp);
            state.users = {
                ...state.users
            };
        },
        setUserData: (state, action) => {
            let ud = action.payload;
            if (!Array.isArray(ud)) {
                ud = [ud];
            }

            for (let x of ud) {
                let existing = state.users[x.pubkey];
                if (existing) {
                    if(existing.fromEvent.created_at > x.fromEvent.created_at) {
                        // prevent patching with older metadata 
                        continue;
                    }
                    x = {
                        ...existing,
                        ...x
                    };
                }
                state.users[x.pubkey] = x;
                window.localStorage.setItem(`user:${x.pubkey}`, JSON.stringify(x));

                state.users = {
                    ...state.users
                };
            }
        },
        resetProfile: (state, action) => {
            if (state.users[action.payload]) {
                delete state.users[action.payload];
                state.users = {
                    ...state.users
                };
            }
        }
    }
});

export const { addPubKey, setUserData, resetProfile } = UsersSlice.actions;
export const reducer = UsersSlice.reducer;