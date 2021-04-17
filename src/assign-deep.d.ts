declare module 'assign-deep' {
    export default function assign<T1, T2>(target: T1, o2: T2): T1 & T2;
    export default function assign<T1, T2, T3>(target: T1, o2: T2, o3: T3): T1 & T2 & T3;
    export default function assign<T1, T2, T3, T4>(target: T1, o2: T2, o3: T3, o4: T4): T1 & T2 & T3 & T4;
    export default function assign<T1, T2, T3, T4, T5>(target: T1, o2: T2, o3: T3, o4: T4, o5: T5): T1 & T2 & T3 & T4 & T5;
    export default function assign<T1, T2, T3, T4, T5, T6>(target: T1, o2: T2, o3: T3, o4: T4, o5: T5, o6: T6): T1 & T2 & T3 & T4 & T5 & T6;
    export default function assign<T1, T2, T3, T4, T5, T6, T7>(target: T1, o2: T2, o3: T3, o4: T4, o5: T5, o6: T6, o7: T7): T1 & T2 & T3 & T4 & T5 & T6 & T7;
    export default function assign<T1, T2, T3, T4, T5, T6, T7, T8>(target: T1, o2: T2, o3: T3, o4: T4, o5: T5, o6: T6, o7: T7, o8: T8): T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8;
    export default function assign<T1>(target: T1, ...args: unknown[]): T1 & unknown;
}
