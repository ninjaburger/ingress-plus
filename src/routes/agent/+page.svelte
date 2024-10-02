<script>
  import { slide } from 'svelte/transition'
  import sortBy from 'lodash.sortby'
  import { toast } from '@zerodevx/svelte-toast'
  import { goto } from '$app/navigation'
  import { browser } from '$app/environment'
  import { badgeSize, authData, ownedBadges } from '$lib/stores'
  import { pb, serverAddress } from '$lib/pocketbase'
  import zalgo from '$lib/zalgo'
  import Modal from '$lib/components/Modal.svelte'
  import { isNumber } from '$lib/utils.js'

    const thumbSize = (badgeSize) => {
    if (badgeSize <= 64) return '96x96'
    if (badgeSize <= 128) return '128x128'
    return '256x256'
  }

  let editVisible = false
  
  let width = 1
  const badgesPerRow = 6
  let rows = 1
  let sortedBadges = []

  $: badgeSize.set(Math.min(128, width / 7))
  $: rows = Math.ceil($ownedBadges.length / badgesPerRow)
  $: sortedBadges = sortBy($ownedBadges.filter(b => b.expand?.badge?.expand?.category?.profile_visible || false), [
    'expand.badge.expand.category.sorting',
    'expand.badge.sorting'
  ]).reverse()
  
  $: if (browser && $authData.isValid === false) goto('/')

  const toggleFaction = async () => {
      $authData.baseModel.faction = $authData.baseModel.faction === 'enlightened' ? 'resistance' : 'enlightened'
      await pb.collection('users').update($authData.baseModel.id, $authData.baseModel)
    }
    
    const togglePublic = async () => {
        $authData.baseModel.public = !$authData.baseModel.public
        await pb.collection('users').update($authData.baseModel.id, $authData.baseModel)
    }
    
    let newUsername = ''
    $: username = $authData?.baseModel?.username || ''
    $: newUsername = username
    const saveUsername = async () => {
        const oldUsername = $authData.baseModel.username
        try {
            $authData.baseModel.username = newUsername
            await pb.collection('users').update($authData.baseModel.id, $authData.baseModel)
        } catch (err) {
            $authData.baseModel.username = oldUsername
            console.error(username, err)
            toast.push('An error has occurred.', { classes: ['errorToast'] })
            return
        }
        editVisible = false
    }

    $: factionLogo = $authData?.baseModel?.faction === 'machina'
    ? 'machina.png'
    : `${$authData?.baseModel?.faction || 'unaligned'}.svg`
    
    const copyProfileLink = async () => {
        try {
            await navigator.clipboard.writeText(`https://ingress.plus/agent/${newUsername}`)
      toast.push('Copied to clipboard!', { classes: ['successToast'] })
    } catch (err) {
        console.error(err)
        toast.push('An error has occurred.', { classes: ['errorToast'] })
    }
}
/* all-time stats */
let showModal;
let statInput = '';

function parseStats(input){
    const fieldNames = [
        'Time Span',
        'Agent Name',
        'Agent Faction',
        'Date (yyyy-mm-dd)',
        'Time (hh:mm:ss)',
        'Level',
        'Lifetime AP',
        'Current AP',
        'Unique Portals Visited',
        'Unique Portals Drone Visited',
        'Furthest Drone Distance',
        'Portals Discovered',
        'Seer Points',
        'XM Collected',
        'OPR Agreements',
        'Portal Scans Uploaded',
        'Uniques Scout Controlled',
        'Resonators Deployed',
        'Links Created',
        'Control Fields Created',
        'Mind Units Captured',
        'Longest Link Ever Created',
        'Largest Control Field',
        'XM Recharged',
        'Portals Captured',
        'Unique Portals Captured',
        'Mods Deployed',
        'Hacks',
        'Drone Hacks',
        'Glyph Hack Points',
        'Overclock Hack Points',
        'Completed Hackstreaks',
        'Longest Sojourner Streak',
        'Resonators Destroyed',
        'Portals Neutralized',
        'Enemy Links Destroyed',
        'Enemy Fields Destroyed',
        'Battle Beacon Combatant',
        'Drones Returned',
        'Machina Links Destroyed',
        'Machina Resonators Destroyed',
        'Machina Portals Neutralized',
        'Machina Portals Reclaimed',
        'Max Time Portal Held',
        'Max Time Link Maintained',
        'Max Link Length x Days',
        'Max Time Field Held',
        'Largest Field MUs x Days',
        'Forced Drone Recalls',
        'Distance Walked',
        'Kinetic Capsules Completed',
        'Unique Missions Completed',
        'Research Bounties Completed',
        'Research Days Completed',
        'Mission Day(s) Attended',
        'NL-1331 Meetup(s) Attended',
        'First Saturday Events',
        'Second Sunday Events',
        'Clear Fields Events',
        'OPR Live Events',
        'Prime Challenges',
        'Intel Ops Missions',
        'Shared Memories Global Op Points',
        'Field Test Dispatch',
        'Recursions',
        'Months Subscribed'
    ];
    const [headerLine, valuesLine] = input.split('\n');
    let fieldMap = new Map();

    const allTimeSplitter = 'ALL TIME';
    if (!valuesLine.startsWith(allTimeSplitter)){
        return fieldMap;
    }

    const values = [allTimeSplitter, ...valuesLine.substring(allTimeSplitter.length).trim().split(/\s+/)];
    const fields = [];
    let currentField = '';

    for (const segment of headerLine.split(/\s+/)) {
        if (currentField) {
            const testField = `${currentField} ${segment}`;
            if (fieldNames.includes(testField)) {
                fields.push(testField);
                currentField = '';
            } else if (fieldNames.includes(segment)) {
                fields.push(segment);
                currentField = '';
            } else {
                currentField += ` ${segment}`;
            }
        } else {
            if (fieldNames.includes(segment)) {
                fields.push(segment);
            } else {
                currentField = segment;
            }
        }
    }

    if (currentField) {
        fields.push(currentField.trim());
    }

    for (let i = 0; i < fields.length; i++) {
        let val = values[i] || null;
        if (isNumber(val)) {
            val = +val;
        } 

        fieldMap.set(fields[i], val);
    }
    return fieldMap
}
async function handleSubmit() {
    let stats = parseStats(statInput);
    let mapBadges = new Map([
        ['XM Recharged', 'Recharger'],
        ['Completed Hackstreaks', 'Epoch'],
        ['Longest Sojourner Streak', 'Sojourner'],
    ]);
    const badges = await pb.collection('badges')
        .getFullList({
          expand: 'category',
          fields: 'id,tier_values,title,expand.category.tiers',
          filter: `tier_values != '' && unobtainable = false`
        });

    let upsertPromises = [], upsertBadges = [];
    for (const [field, badgeTitle] of mapBadges.entries()) {
        if (!stats.has(field)) continue;

        let badge = badges.find((b) => b.title === badgeTitle);
        if (!badge) continue;
        
        const { tier_values, expand: { category: { tiers } } } = badge;
        const tierValuesArray = tier_values.split(',').map((val) => +val);
        const tiersArray = tiers.split(',');

        const tierMap = new Map(
            tierValuesArray.map((value, index) => [value, tiersArray[index]])
        );

        const getTierIndex = (value) => {
            const tierEntries = Array.from(tierMap);
            const sortedTiers = tierEntries.slice().sort(([a], [b]) => b - a);
            const match = sortedTiers.find(([threshold]) => value >= threshold);
            return match ? tierEntries.findIndex(([threshold]) => threshold === match[0]) : -1;
        };

        let tier = getTierIndex(stats.get(field));
        const item = $ownedBadges.find((b) => b.badge === badge.id);

        if (!item && tier >= 0) {
            upsertBadges.push(`${badgeTitle} (${tiersArray[tier]})`);
            upsertPromises.push(
                pb.collection('user_badges').create({
                    user: pb.authStore.model.id,
                    badge: badge.id,
                    tier
                },
                {
                    requestKey: null
                })
            );
        } else if (tier > item?.tier) {
            upsertBadges.push(`${badgeTitle} (${tiersArray[tier]})`);
            upsertPromises.push(
                pb.collection('user_badges').update(
                    item.id, { ...item, tier}, { requestKey: null }
                )
            );
        }
    }
    if (upsertPromises.length > 0){
        await Promise.all(upsertPromises).then(async () => {
            await refreshOwnedBadges();
            toast.push(`Badges marked as obtained:\n${upsertBadges.join(', ')}`, { classes: ['successToast'] });
        })
    }
    showModal = false;
}
const refreshOwnedBadges = async () => ownedBadges.set(
    await pb.collection('user_badges').getFullList({
      expand: 'badge,badge.category',
      filter: `user="${pb.authStore.model.id}"`
    }))
</script>

<svelte:head>
    <title>Ingress Plus &middot; {username || 'Agent Profile'}</title>
</svelte:head>

<section bind:clientWidth={width} style="--badge-size: {$badgeSize}px">
    {#if !editVisible}
    <h2 transition:slide style="color: var(--color-faction-{$authData?.baseModel?.faction || 'unaligned'})" on:click={() => (editVisible = true)}>
      {#if $authData?.baseModel?.faction === 'machina'}
                {zalgo(username)}
            {:else}
                {username}
            {/if}
        </h2>
    {:else}
        <div transition:slide class="editbox">
      <img src="/images/{factionLogo}" height="64" alt={$authData?.baseModel?.faction || 'unaligned'} on:click={toggleFaction} />
      <input type="text" bind:value={newUsername} style="color: var(--color-faction-{$authData?.baseModel?.faction || 'unaligned'})" />
            <div class="actions">
        <img src={$authData.baseModel.public ? '/images/public.svg' : '/images/private.svg'} alt={$authData.baseModel.public ? 'Public' : 'Private'} height="32" on:click={togglePublic} />
        <img src="/images/accept.svg" height="32" alt="Save" on:click={saveUsername} />
        <img src="/images/import.svg" height="32" alt="Import stats" on:click={() => showModal = true  } />
            </div>
        </div>
        {#if $authData.baseModel.public}
            <p transition:slide class="publicNotice">
                Your profile is public and will be visible at:<br />
                <span on:click={copyProfileLink}>
                    https://ingress.plus/agent/{newUsername}
                </span>
            </p>
        {/if}
        <Modal bind:showModal>
            <header>
              <h2>Update badge progress</h2>
            </header>
            <form on:submit|preventDefault={handleSubmit}>
                <p>Paste your <strong>All-Time Stats export</strong> below to update your badge progress:</p>
                <label for="stat-input">All-Time Stats:</label>
                <textarea id="stat-input" name="stats" placeholder="Paste your stats here..." required bind:value={statInput}></textarea>
                <footer>
                    <button type="button" on:click={() => (showModal = false)}>Close</button>
                    <button type="submit" disabled={!statInput?.startsWith("Time Span")}>Update</button>
                </footer>
            </form>
        </Modal>
    {/if}

    <div class="badges">
        {#each { length: rows } as _, r}
            <div>
                {#each { length: badgesPerRow } as _, c}
                    {@const badge = sortedBadges[r * badgesPerRow + c]}
                    {#if badge}
          <img height="{$badgeSize}" width="{$badgeSize}" alt="{badge.expand.badge.title}"
            src="{serverAddress}/api/files/{badge.expand.badge.collectionId}/{badge.expand.badge.id}/{badge.expand.badge.image[badge.tier]}?thumb={thumbSize($badgeSize)}" />
                    {/if}
                {/each}
            </div>
        {/each}
    </div>
</section>
   
<style>
    h2 {
        text-align: center;
        margin: calc(var(--badge-size) / 2) 0;
        font-size: 1.75em;
        text-shadow: 0 0 10px black;
        display: flex;
        align-content: center;
        justify-content: center;
        cursor: pointer;
    }
    div.editbox {
        display: flex;
        margin: 2em 1em;
        align-items: center;
        justify-content: space-around;
    }
    div.editbox img {
        cursor: pointer;
        margin-left: 1em;
    }
    section {
        max-width: 1200px;
        margin: auto;
    }
    div.badges {
        margin: auto;
        width: fit-content;
        margin-top: 3em;
    }
    div.badges div {
        white-space: nowrap;
        margin-top: calc(var(--badge-size) / -5);
    }
    div.badges div:nth-child(even of div) {
        margin-left: calc(var(--badge-size) / 2);
    }
    p.publicNotice {
        text-align: center;
        color: var(--color-faction-unaligned)
    }
    p.publicNotice span {
        border: 3px double #5e5a75;
        border-radius: 8px;
        display: inline-block;
        padding: 1rem;
        margin-top: 1rem;
        cursor: pointer;
    }
    /* all-time stats */
    form {
        background: rgba(14, 11, 28, 0.9);
        margin-top: calc(var(--badge-size) * -1);
        padding: var(--badge-size) 2em 1em 2em;
        color: #9593c3;
        border: 3px double #5e5a75;
        border-radius: 8px;
        text-align: center;
        font-size: larger;
        white-space: pre-wrap;
        word-break: break-word;
        overflow: auto;
        max-height: 50vh;
    }
    form textarea {
        width: calc(100% - 2em);
        margin: 0.5em 0;        
        background: rgba(14, 11, 28, 0.9);        
        border-color: #5e5a75;
        border-radius: 8px;
        padding: 0.25em 0.5em;
        min-width: 50%;
        color: #9593c3;
        padding: 1rem;
        font-size: medium;
        overflow-y: auto;
        resize: vertical;
    }
    form > footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin: 1em auto auto;
    }
    label {
        display: flex;
        flex-direction: column;
    }
    header h2 {
        color: #9593c3;
    }
    form button {
        width: 100%;
        max-width: 8em;
        padding: 0.25em 0;
        color: #FFF;
        background: rgb(50,60,110);
        background: linear-gradient(to right, rgba(50,60,110,1) 0%, rgba(52,39,83,1) 50%, rgba(83,52,118,1) 100%);
        border-color: #9593c3;
        border-radius: 6px;
        font-size: medium;
    }    
    form button:disabled {
        color: rgb(200, 200, 200);
        background: rgb(50,60,110);
        cursor: not-allowed;
        opacity: 0.7;
    }
</style>
