const getNextSpontinousTransition = (δ) => {
    const index = δ.findIndex(({ Σ }) => Σ === null)
    return index === -1 ? null : δ.splice(index, 1)[0]
}

const transformSpontaniousTransitions = (NFA) => {
    let spontaniousTransition = getNextSpontinousTransition(NFA.δ)
    do {
        const greenRuleTransitions = NFA.δ
            .filter(({ from }) => from === spontaniousTransition.to )
            .map((newTransition) => ({ ...newTransition, from: spontaniousTransition.from }))

        const blueRuleTransitions = NFA.δ
            .filter(({ to }) => to === spontaniousTransition.from )
            .map((newTransition) => ({ ...newTransition, to: spontaniousTransition.to }))

        NFA.δ = [
            ...NFA.δ,
            ...greenRuleTransitions,
            ...blueRuleTransitions
        ]
        spontaniousTransition = getNextSpontinousTransition(NFA.δ)
    } while (spontaniousTransition !== null)
}

const mergeDownTransitions = (signals, transitions, statesToExpand, expandedStates) => {
    const elementToExpand = statesToExpand.shift()
    const fromStates = elementToExpand.split(' ')

    const newDfaStates = signals.map(signal => {
        const results = fromStates.map(from => {
            const tr = transitions
                .filter(tr => tr.from === from && tr.Σ === signal)
                .map(tr => tr.to)
                .sort((a, b) => Number(a) - Number(b))

            return tr.join(' ')
        })

        results.sort((a, b) => Number(a) - Number(b))
        return [...(new Set(results))].join(' ')
    }).map(x => x === '' ? 'TRAP' : x.trim())

    expandedStates.add(elementToExpand)
    statesToExpand = [
        ...statesToExpand,
        ...newDfaStates.filter(newState => !expandedStates.has(newState) && !statesToExpand.includes(newState)) // Kapottakból csak azokat bontsuk tovább amit még nem vizsgáltunk és amit már nem tettünk csőbe
    ]

    const dfaTransitions = signals.map((signal, index) => ({
        from: elementToExpand, Σ: signal, to: newDfaStates[index]
    }))

    if (statesToExpand.length) {
        return [ ...dfaTransitions, ...mergeDownTransitions(signals, transitions, statesToExpand, expandedStates) ]
    }

    return [
        ...dfaTransitions,
        ...signals.map(signal => ({
            from: 'TRAP', Σ: signal, to: 'TRAP'
        }))
    ]
}

const convertNfaToDfa = ({ Σ, δ, q0, F }) => {
    DFA_δ = mergeDownTransitions(Σ, δ, [q0], new Set(['TRAP']))
    DFA_Q = [
        ...DFA_δ.reduce((acc, {from, to}) => {
            acc.add(from)
            acc.add(to)
            return acc
        }, new Set())
    ]
    DFA_F = DFA_δ.reduce((acc, { to }) => {
        if (to === 'TRAP') {
            return acc
        }

        if (F.some(nfaFinalState => to.includes(String(nfaFinalState)))) {
            acc.add(to)
            return acc
        }

        return acc
    }, new Set())
    
    return { 
        Σ,
        q0,
        Q: DFA_Q,
        δ: DFA_δ,
        F: [...DFA_F]}
}

const convertDfaToGraphviz = ({ Q, δ, q0, F }) => {
    const states = Q.map((q) => {
        if (q === 'TRAP') {
            return `q${q} [label = <<i>q</i><sub>${q}</sub>>]`
        }
        const nums = q.split(' ')
        return `q${nums.join('_')} [${F.includes(q) ? 'shape = doublecircle' : ''} label = <${nums.map(n => `<i>q</i><sub>${n}</sub>`).join('')}>]`
    }).join('\n    ')

    const merged = δ.reduce((acc, { from, Σ, to }) => {
        const key = `${from}->${to}`;
        if (!acc[key]) {
            return {
                ...acc,
                [key]: { from, Σ: [Σ], to }
            }
        }

        return {
            ...acc,
            [key]: { from, Σ: [...acc[key].Σ, Σ], to }
        }
    }, {});

    const transitions = Object.values(merged).map(({ from, Σ, to }) => {
        const fromNums = from.split(' ')
        const toNums = to.split(' ')
        return `q${fromNums.join('_')} -> q${toNums.join('_')} [label = <${Σ.map(s => `<i>${s}</i>`).join(',')}>]`
    }).join('\n    ')

    return `
digraph nfo_to_dfa {
    fontname="Helvetica,Arial,sans-serif"
    node [fontname="Helvetica,Arial,sans-serif"]
    edge [fontname="Helvetica,Arial,sans-serif"]
    rankdir=LR
    
    node [shape = plaintext]; start;
    node [shape = circle];
    
    ${states}

    start -> q${q0}
    ${transitions}
}`
}

const NFA = {
    Q: [ '0', '1', '2', '3', '4' ],
    Σ: [ 'a', 'b', 'c' ],
    δ: [
        { from: '0', Σ: 'a', to: '0' },
        { from: '0', Σ: 'a', to: '1' },
        { from: '0', Σ: null, to: '3' },
        { from: '1', Σ: 'b', to: '2' },
        { from: '2', Σ: 'b', to: '4' },
        { from: '4', Σ: 'b', to: '2' },
        { from: '3', Σ: 'c', to: '3' },
        { from: '3', Σ: 'b', to: '1' },
    ],
    q0: '0',
    F: ['2'],
}

transformSpontaniousTransitions(NFA)
const DFA = convertNfaToDfa(NFA)
console.log(convertDfaToGraphviz(DFA))
