import puppeteer from "puppeteer-core";
import Chromium from "@sparticuz/chromium-min";
import { head, put } from "@vercel/blob";
import { convertToJsonAttribute, convertToThreeDigitID } from "./helper";
import { SCRAPER_BASE_URL, SCRAPER_BASE_URL2, DEFAULT_NAVIGATION_TIMEOUT, DEFAULT_TIMEOUT, CONCURRENCY_LIMIT } from "./const";
import fetch from "node-fetch";
import pLimit from "p-limit";

Chromium.setHeadlessMode = true
Chromium.setGraphicsMode = false

export async function fetchListHeroes(){
    const browser = await puppeteer.launch({ 
        headless: Chromium.headless,
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v130.0.0/chromium-v130.0.0-pack.tar"),
        args: [
            ...Chromium.args,
            '--no-sandbox', 
            '--disable-gpu', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas'
        ],
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
    page.setDefaultTimeout(DEFAULT_TIMEOUT)

    // Enable request interception
    await page.setRequestInterception(true);
    // Intercept and block video files
    page.on('request', (request) => {
        if (['font', 'media'].includes(request.resourceType())) {
            return request.abort();  // Block files
        } else {
            request.continue();  // Allow other resources
        }
    });
    
    try{
        // Navigate to the webpage
        await page.goto(`${SCRAPER_BASE_URL}/wiki/List_of_heroes`, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('[data-index-number="0"] thead tr')
        // Get table title
        const tableHeader = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('[data-index-number="0"] thead tr')); // Adjust if your table has a specific class or ID
            
            return rows.map((row) => {
                const columns = Array.from(row.querySelectorAll('th'));
                return columns.map((column) => {
                    return column.innerText.trim()
                });
            });
        })

        // Convert the title into json attributes
        const tableHeaderAttr = tableHeader[0].map(th => convertToJsonAttribute(th))

        // Scrape table content
        const tableData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('[data-index-number="0"] tbody tr')); // Adjust if your table has a specific class or ID

            return rows.map((row) => {
                const columns = Array.from(row.querySelectorAll('td'));
                return columns.map((column, index) => {
                    if(index === 0){
                        const image = column.querySelector("img")
                        const src = image?.getAttribute('data-src') ?? image?.getAttribute('src')
                        return src?.split("/revision/latest/scale-to-width-down")[0]
                    }
                    return column.innerText.trim()
                });
            });
        });

        let hero_id = 1
        // Map the table data
        const mappedData = tableData.map(td => {
            const map = { id: `HE${convertToThreeDigitID(hero_id)}`}
            hero_id++
            td.forEach((data, index) => {
                if(tableHeaderAttr[index] === 'hero'){
                    const hero = data.split(',')
                    map["hero_name"] = hero[0]
                    map["hero_title"] = hero.length > 1 ? hero.slice(1).join(',').trim() : ""
                }
                else if(tableHeaderAttr[index] === 'price'){
                    const price = data.split('\n')
                    map["bp_price"] = price.length > 1 ? price[0] : null
                    map["diamond_price"] = price.length > 1 ? price[1].trim() : price[0] // In case the hero is not available for battle points
                }
                else map[tableHeaderAttr[index]] = data
            })
            return map
        }).filter(hero => (hero.hero_order !== "TBA" && hero.release_date !== "TBA"))
        // Convert JavaScript object to JSON string
        const jsonData = JSON.stringify(mappedData, null, 2)
        // Upload JSON to Vercel Blob
        await put('output/hero.json', jsonData, {access: 'public', addRandomSuffix: false, cacheControlMaxAge: 0});

        return mappedData
    }catch(err){
        throw new Error(err)
    }finally{
        console.log("Closing browser")
        await browser.close()
    }
}

export async function fetchListEquipment(){
    const browser = await puppeteer.launch({ 
        headless: Chromium.headless,
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v130.0.0/chromium-v130.0.0-pack.tar"),
        args: [
            ...Chromium.args,
            '--no-sandbox', 
            '--disable-gpu', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas'
        ],
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
    page.setDefaultTimeout(DEFAULT_TIMEOUT)

    // Enable request interception
    await page.setRequestInterception(true);
    // Intercept and block video files
    page.on('request', (request) => {
        if (['font', 'media'].includes(request.resourceType())) {
            return request.abort();  // Block files
        } else {
            request.continue();  // Allow other resources
        }
    });

    try{
        // Navigate to the webpage
        await page.goto(`${SCRAPER_BASE_URL}/wiki/Equipment`, { waitUntil: 'domcontentloaded' });

        // Scroll back to top
        await page.evaluate(_ => {
            document.getElementById('List_of_equipment').scrollIntoView(true)
        });

        const contents = await page.evaluate(() => {
            const tabContents = Array.from(document.querySelectorAll(".tabber-2 .wds-tab__content"))

            return tabContents.map(tabContent => {
                const equipments = Array.from(tabContent.querySelectorAll(":scope > div"))
                return equipments.filter(equipment => equipment.innerHTML).map(equipment => {
                    const image = equipment.querySelector(".ml-img img")
                    const src = image?.getAttribute('data-src') ?? image?.getAttribute('src')
                    const title = equipment.querySelector("div")
                    return { 
                        icon: src?.split("/revision/latest")[0], 
                        item_name: title.innerText.trim()
                    }
                })
            }).flat()
        })

        // Remove duplicates from JSON Array
        const uniqueContents = Array.from(new Set(contents.map(JSON.stringify))).map(JSON.parse);

        // Convert JavaScript object to JSON string
        const jsonData = JSON.stringify(uniqueContents.map((d, idx) => ({
            id: `EQ${convertToThreeDigitID(idx + 1)}`,
            ...d
        })), null, 2)

        // Upload JSON to Vercel Blob
        await put('output/equipment.json', jsonData, {access: 'public', addRandomSuffix: false, cacheControlMaxAge: 0});

        return uniqueContents
    }catch(err){
        throw new Error(err)
    }finally{
        console.log("Closing browser")
        await browser.close()
    }
}

export async function fetchHeroDetails(offset = 0, limit = 20){
    if(limit <= 0) return

    const p_limit = pLimit(CONCURRENCY_LIMIT)
    const browser = await puppeteer.launch({ 
        headless: Chromium.headless,
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v130.0.0/chromium-v130.0.0-pack.tar"),
        args: [
            ...Chromium.args,
            '--no-sandbox', 
            '--disable-gpu', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas'
        ],
        ignoreHTTPSErrors: true
    });

    try{
        const { url } = await head("output/hero.json")
        const heroList = await fetch(url).then(res => res.json())
        const start = Math.max(offset, 0)
        const end = start + limit
        const taskDatas = heroList
            .slice(start, end)
            .map(hero => ({
                hero: hero,
                url: `${SCRAPER_BASE_URL}/wiki/${encodeURIComponent(hero.hero_name.split(' ').join('_'))}`
            }))

        const TOTAL_TASK_COUNT = taskDatas.length
        const performTask = async({hero, url}, index) => {
            try{
                const data = await head(`hero/${hero.id}.json`)
                const heroDetail = await fetch(data.url).then(res => res.json())
                if(heroDetail.lastUpdated && heroDetail.lastUpdated === new Date().toDateString()){
                    console.log(`Skipped navigating to ${url}`)
                    return
                }
            }catch(err){
                // Do nothing
            }
            
            console.log(`Navigating to ${url} (${index + 1}/${TOTAL_TASK_COUNT})`)
            const page = await browser.newPage()
            page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
            page.setDefaultTimeout(DEFAULT_TIMEOUT)
            // Enable request interception
            await page.setRequestInterception(true);
            // Intercept and block video, stles, and font files
            page.on('request', (request) => {
                if (['stylesheet', 'font', 'media'].includes(request.resourceType())) {
                    return request.abort();  // Block files
                } else {
                    request.continue();  // Allow other resources
                }
            });

            try{
                await page.waitForSelector('[data-index-number="2"]')
                // Navigate to the webpage
                await page.goto(`${SCRAPER_BASE_URL}/wiki/${encodeURIComponent(hero.hero_name.split(' ').join('_'))}`, { waitUntil: 'domcontentloaded' });
                
                const heroDetail = await page.evaluate(() => {
                    // General Attributes
                    const skill_resource = document.querySelector('[data-source="resource"] .pi-data-value > a')
                    const damage_type = document.querySelector('[data-source="dmg_type"] .pi-data-value > a')
                    const attack_type = document.querySelector('[data-source="atk_type"] .pi-data-value > a')
                    const release_date = document.querySelector('[data-source="release_date"] .pi-data-value')

                    const durability = document.querySelector('[data-source="durability"] .pi-data-value .progress .bar')
                    const offense = document.querySelector('[data-source="offense"] .pi-data-value .progress .bar')
                    const control_effect = document.querySelector('[data-source="control effect"] .pi-data-value .progress .bar')
                    const difficulty = document.querySelector('[data-source="difficulty"] .pi-data-value .progress .bar')

                    const rows = Array.from(document.querySelectorAll('[data-index-number="2"] tbody tr'))

                    let base_attributes = {}
                    rows.forEach((row) => {
                        const columns = Array.from(row.querySelectorAll('td'));
                        if(columns.length === 0) return
                        const attribute = columns.map(column => column.innerText.trim());
                        let level1, level15, growth, percentage
                        if(attribute.length === 5){
                            level1 = parseInt(attribute[1].split(' ')[0] ?? 0)
                            level15 = parseInt(attribute[2].split(' ')[0] ?? 0)
                            growth = parseInt(attribute[3].split(' ')[0] ?? 0)
                            percentage = attribute[4]
                        }else if(attribute.length === 3){
                            level1 = level15 = parseInt(attribute[1].split(' ')[0] ?? 0)
                            growth = Math.round((level15 - level1) / 14 * 100) / 100
                            percentage = attribute[2]
                        }
                        base_attributes[`${attribute[0].toLowerCase().split('\n')[0].split(' ').join('_')}`] = {
                            level1,
                            level15,
                            growth,
                            percentage
                        }
                    });
                    
                    return {
                        skill_resource: skill_resource?.innerText.trim(),
                        damage_type: damage_type?.innerText.trim(),
                        attack_type: attack_type?.innerText.trim(),
                        release_date: release_date?.innerText.trim(),
                        ratings: {
                            durability: parseInt(durability?.innerText.trim() ?? 0),
                            offense: parseInt(offense?.innerText.trim() ?? 0),
                            control_effect: parseInt(control_effect?.innerText.trim() ?? 0),
                            difficulty: parseInt(difficulty?.innerText.trim() ?? 0)
                        },
                        base_attributes: base_attributes,
                    }
                })

                await page.goto(`${SCRAPER_BASE_URL2}/mobilelegends/${encodeURIComponent(hero.hero_name.split(' ').join('_'))}`, { waitUntil: 'domcontentloaded' })

                const skills = await page.evaluate(() => {
                    const skill_cards = Array.from(document.querySelectorAll('.spellcard-wrapper .spellcard'))

                    return skill_cards.map(skill_card => {
                        const name = skill_card.querySelector(':scope > div:first-child')
                        let description = Array.from(skill_card.querySelectorAll('.spellcard-description > p:not(.mw-empty-elt)')).map(el => el.innerText.trim()).join('\n')
                        const skill_info = Array.from(skill_card.querySelectorAll('.spellcard-infotable > div')).map(el => el.innerText.trim())
                        let base_cooldown = skill_info.length > 0 ? skill_info[0] : null
                        let base_cost = skill_info.length > 1 ? skill_info[1] : null
                        const image = skill_card.querySelector('div > div img')

                        if(description.length === 0){
                            const description_list = Array.from(skill_card.querySelectorAll(':scope .spellcard-description'))
                            description = description_list[description_list.length - 1]?.innerText.trim()
                            base_cooldown = description_list[0]?.innerText.split(':')[1]
                            if(description_list.length === 3){
                                base_cost = description_list[1]?.innerText.split(':')[1]
                            }
                        }

                        return {
                            name: name?.innerText.trim(),
                            description: description,
                            icon: image?.src,
                            base_cooldown: base_cooldown ? parseFloat(base_cooldown) : null,
                            base_cost: base_cost ? parseInt(base_cost) : null
                        }
                    })
                })

                const heroData = {
                    ...hero, 
                    ...heroDetail, 
                    skills,
                    lastUpdated: new Date().toDateString()
                }

                await put(`hero/${heroData.id}.json`, JSON.stringify(heroData, null, 2), { access: 'public', addRandomSuffix: false, cacheControlMaxAge: 0 })
            }catch(err){
                console.log(`Error Navigating to ${url}: ${err}`)
            }finally{
                await page.close()
            }
        }

        const promises = taskDatas.map(async(data, index) => {
            return p_limit(() => performTask(data, index))
        })
        await Promise.all(promises)
    }catch(err){
        throw new Error(err)
    }finally{
        // Closing browser
        console.log("Closing browser")
        await browser.close()
    }
}

export async function fetchEquipmentDetails(offset = 0, limit = 20){
    if(limit <= 0) return
    const p_limit = pLimit(CONCURRENCY_LIMIT)
    const browser = await puppeteer.launch({ 
        headless: Chromium.headless,
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v130.0.0/chromium-v130.0.0-pack.tar"),
        args: [
            ...Chromium.args,
            '--no-sandbox', 
            '--disable-gpu', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas'
        ],
        ignoreHTTPSErrors: true
    });

    try{
        const { url } = await head("output/equipment.json")
        const equipmentList = await fetch(url).then(res => res.json())
        const start = Math.max(offset, 0)
        const end = start + limit
        const taskDatas = equipmentList
            .slice(start, end)
            .map(equipment => ({
                equipment: equipment,
                url: `${SCRAPER_BASE_URL}/wiki/${encodeURIComponent(equipment.item_name.split(' ').join('_'))}`
            }))
    
        const TOTAL_TASK_COUNT = taskDatas.length
        const performTask = async({equipment, url}, index) => {
            try{
                const data = await head(`equipment/${equipment.id}.json`)
                const equipmentDetail = await fetch(data.url).then(res => res.json())
                if(equipmentDetail.lastUpdated && equipmentDetail.lastUpdated === new Date().toDateString()){
                    console.log(`Skipped navigating to ${url}`)
                    return
                }
            }catch(err){
                // Do nothing
            }
            
            console.log(`Navigating to ${url} (${index + 1}/${TOTAL_TASK_COUNT})`)
            const page = await browser.newPage()
            page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
            page.setDefaultTimeout(DEFAULT_TIMEOUT)
            // Enable request interception
            await page.setRequestInterception(true);
            // Intercept and block video, stles, and font files
            page.on('request', (request) => {
                if (['stylesheet', 'font', 'media'].includes(request.resourceType())) {
                    return request.abort();  // Block files
                } else {
                    request.continue();  // Allow other resources
                }
            });
    
            try{
                // Navigate to the webpage
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                        
                const equipmentDetail = await page.evaluate(() => {
                    // General Attributes
                    // const item_name = document.querySelector('[data-source="title1"]')
                    // const image = document.querySelector('#mw-content-text > div.mw-parser-output > aside > figure > a > img')
                    const summary = document.querySelector('#mw-content-text > div.mw-parser-output > aside > figure > figcaption')
                    const item_price = document.querySelector('[data-source="total_price"] > span')
                    const item_sell_price = document.querySelector('[data-source="sell"] > span')
                    const type = document.querySelector('[data-source="type"] > div')
                    const sellable = document.querySelector('[data-source="salability"] > div')
                    const availability = document.querySelector('[data-source="availability"] > div')
                    const takes_slot = document.querySelector('[data-source="slot"] > div')
                    
                    // Modifiers
                    let modifiers = {}
                    const modifierData = document.querySelector('[data-source="bonus"] > div')
                    modifierData?.innerHTML.split('<br>').forEach(modifier => {
                        const regex = /^([+-]?\d+)%?\s*(.*)$/;
                        const matches = modifier.trim().match(regex);
                        if(matches){
                            const attribute = matches[2].toLowerCase().split(' ').join('_')
                            modifiers[attribute] = matches[1]
                        }
                    })
    
                    // Unique Modifiers
                    let uniqueModifiers = {
                        unique_active: [],
                        active: [],
                        passive: [],
                        unique_passive: []
                    }
                    const uniqueData = document.querySelector('[data-source="unique"] > div')
                    uniqueData?.innerHTML.split('<br>').forEach(uniqueModifier => {
                        const regex = /(\w+\s\w+)\s-\s(.+?):\s*(.*)/;
                        const matches = uniqueModifier.trim().match(regex);
                        if(matches){
                            const attribute = matches[1].toLowerCase().split(' ').join('_')
    
                            uniqueModifiers[attribute].push({
                                name: matches[2],
                                description: matches[3]
                            }) 
                        }else{
                            const modifier = uniqueModifier.split(':')[1]?.trim() ?? ""
                            if(modifier){
                                const regex = /^([+-]?\d+)%?\s*(.*)$/;
                                const matches = modifier.trim().match(regex);
                                if(matches){
                                    const attribute = matches[2].toLowerCase().split(' ').join('_')
                                    modifiers[attribute] = matches[1]
                                }
                            }
                        }
                    })
    
                    return {
                        // icon: image?.src.split("/revision/latest")[0],
                        // item_name: item_name?.innerText.trim() ?? "",
                        item_price: parseInt(item_price?.innerText.trim() ?? 0),
                        item_sell_price: parseInt(item_sell_price?.innerText.trim() ?? 0),
                        summary: summary?.innerText.trim(),
                        modifiers: modifiers,
                        ...uniqueModifiers,
                        type: type?.innerText.trim(),
                        sellable: sellable?.innerText.trim().toLowerCase() === 'yes',
                        availability: availability?.innerText.trim(),
                        takes_slot: takes_slot?.innerHTML.trim().toLowerCase() === 'yes'
                    }
                })
    
                const equipmentData = {
                    ...equipment,
                    ...equipmentDetail,
                    lastUpdated: new Date().toDateString()
                }

                await put(`equipment/${equipmentData.id}.json`, JSON.stringify(equipmentData, null, 2), { access: 'public', addRandomSuffix: false, cacheControlMaxAge: 0 })
            }catch(err){
                console.log(`Error Navigating to ${url}: ${err}`)
            }finally{
                await page.close()
            }
        }
    
        const promises = taskDatas.map(async(data, index) => {
            return p_limit(() => performTask(data, index))
        })
        await Promise.all(promises)
    }catch(err){
        throw new Error(err)
    }finally{
        // Closing browser
        console.log("Closing browser")
        await browser.close()
    }
}

export async function fetchListEmblem(){
    const browser = await puppeteer.launch({ 
        headless: Chromium.headless,
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v130.0.0/chromium-v130.0.0-pack.tar"),
        args: [
            ...Chromium.args,
            '--no-sandbox', 
            '--disable-gpu', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas'
        ],
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
    page.setDefaultTimeout(DEFAULT_TIMEOUT)

    // Enable request interception
    await page.setRequestInterception(true);
    // Intercept and block video files
    page.on('request', (request) => {
        if (['font', 'media'].includes(request.resourceType())) {
            return request.abort();  // Block files
        } else {
            request.continue();  // Allow other resources
        }
    });

    try{
        // Navigate to the webpage
        await page.goto(`${SCRAPER_BASE_URL2}/mobilelegends/Portal:Emblems`, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('.tabs-content')
        const contents = await page.evaluate(() => {
            const tabContents = Array.from(document.querySelectorAll(".tabs-content > div"))

            return tabContents.map((tabContent, index) => {
                const name = tabContent.querySelector('h3 > .mw-headline > div')?.innerText.trim()
                const image = tabContent.querySelector('img')
                const modifiers = {}
                Array.from(tabContent.querySelectorAll("dl > dd")).forEach(modifier => {
                    const attribute = modifier.innerText.split(":")
                    const attribute_name = attribute[0].toLowerCase().split(" ").join("_")
                    const attribute_value = attribute[1].replace("+", "").trim()
                    modifiers[attribute_name] = attribute_value.includes('%') ? attribute_value : parseInt(attribute_value)
                })

                const standard_talents = []
                const standardTitle = document.getElementById(index === 0 ? `Standard_Talents` : `Standard_Talents_${index + 1}`).parentElement
                let sibling = standardTitle.nextElementSibling
                while(sibling.tagName.toLowerCase() !== 'p'){
                    if(sibling.tagName.toLowerCase() === 'div'){
                        const image = sibling.querySelector('img')
                        const contents = Array.from(sibling.querySelectorAll('div'))
                        const name = contents[0]?.innerText.trim()
                        const description = contents[2]?.innerText.trim()

                        standard_talents.push({
                            name: name,
                            description: description,
                            icon: image?.src
                        })
                    }
                    sibling = sibling.nextElementSibling
                }

                const core_talents = []
                const coreTitle = document.getElementById(index === 0 ? `Core_Talents` : `Core_Talents_${index + 1}`).parentElement
                sibling = coreTitle.nextElementSibling
                while(sibling){
                    if(sibling.tagName.toLowerCase() === 'div'){
                        const image = sibling.querySelector('img')
                        const contents = Array.from(sibling.querySelectorAll('div'))
                        const name = contents[0]?.innerText.trim()
                        const description = contents[2]?.innerText.trim()

                        core_talents.push({
                            name: name,
                            description: description,
                            icon: image?.src
                        })
                    }
                    sibling = sibling.nextElementSibling
                }

                return {
                    name: name.split(" Emblem")[0],
                    icon: image?.src,
                    modifiers: modifiers,
                    standard_talents: standard_talents,
                    core_talents: core_talents
                }
            })
        })

        // Convert JavaScript object to JSON string
        const jsonData = JSON.stringify(contents, null, 2)
        // Upload JSON file to Blob Storage
        await put('output/emblem.json', jsonData, {access: 'public', addRandomSuffix: false, cacheControlMaxAge: 0});

        return contents
    }catch(e){
        console.log(e)
    }finally{
        // Close browser
        await browser.close();
    }
}