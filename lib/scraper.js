import puppeteer from "puppeteer-core";
import { Cluster } from "puppeteer-cluster";
import Chromium from "@sparticuz/chromium-min";
import { head, put } from "@vercel/blob";
import { wait, convertToJsonAttribute } from "./helper";
import { SCRAPER_BASE_URL, SCRAPER_BASE_URL2, DEFAULT_NAVIGATION_TIMEOUT, DEFAULT_TIMEOUT } from "./const";
import fetch from "node-fetch";

Chromium.setHeadlessMode = true
Chromium.setGraphicsMode = false

export async function fetchListHeroes(){
    const browser = await puppeteer.launch({ 
        headless: Chromium.headless,
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar"),
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
        if (request.resourceType() === 'media') {
            request.abort();  // Block videos
        } else {
            request.continue();  // Allow other resources
        }
    });
    
    try{
        // Navigate to the webpage
        await page.goto(`${SCRAPER_BASE_URL}/wiki/List_of_heroes`, { waitUntil: 'domcontentloaded' });

        // # HANDLING LAZY LOADED IMAGES
        // Get the height of the rendered page
        const bodyHandle = await page.$('body');
        const { height } = await bodyHandle.boundingBox();
        await bodyHandle.dispose();

        // Scroll one viewport at a time, pausing to let content load
        const viewportHeight = page.viewport().height;
        let viewportIncr = 0;
        while (viewportIncr + viewportHeight < height) {
            await page.evaluate(_viewportHeight => {
                window.scrollBy(0, _viewportHeight);
            }, viewportHeight);
            await wait(500);
            viewportIncr = viewportIncr + viewportHeight;
        }

        // Some extra delay to let images load
        await wait(2000);

        // Get table title
        const tableHeader = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('[data-index-number="0"] thead tr')); // Adjust if your table has a specific class or ID
            
            return rows.map((row) => {
                const columns = Array.from(row.querySelectorAll('td, th'));
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
                const columns = Array.from(row.querySelectorAll('td, th'));
                return columns.map((column, index) => {
                    if(index === 0){
                        const image = column.querySelector("img")
                        return image.src.split("/revision/latest/scale-to-width-down")[0]
                    }
                    return column.innerText.trim()
                });
            });
        });

        // Map the table data
        const mappedData = tableData.map(td => {
            const map = {}
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
        })
        // Convert JavaScript object to JSON string
        const jsonData = JSON.stringify(mappedData, null, 2)
        // Upload JSON to Vercel Blob
        const blob = await put('output/hero.json', jsonData, {access: 'public', addRandomSuffix: false});
        return blob
    }catch(err){
        console.log(err)
        return ({ error: err })
    }finally{
        // Close All
        await browser.close()
    }
}

export async function fetchListEquipment(){
    const browser = await puppeteer.launch({ 
        headless: Chromium.headless,
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar"),
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
        if (request.resourceType() === 'media') {
            request.abort();  // Block videos
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
    
    
        const tabs = await page.$$(".tabber-2 .wds-tabs .wds-tabs__tab")
        for (let i = 0; i < tabs.length; i++) {
            await tabs[i].click(); // Click each element
            await wait(800);
        }
        // Some extra delay to let images load
        await wait(2000)
    
        const contents = await page.evaluate(() => {
            const tabContents = Array.from(document.querySelectorAll(".tabber-2 .wds-tab__content"))
    
            return tabContents.map(tabContent => {
                const equipments = Array.from(tabContent.querySelectorAll(":scope > div"))
                return equipments.filter(equipment => equipment.innerHTML).map(equipment => {
                    const image = equipment.querySelector(".ml-img img")
                    const title = equipment.querySelector("div")
                    return { 
                        icon: image.src.split("/revision/latest/scale-to-width-down")[0], 
                        name: title.innerText.trim()
                    }
                })
            }).flat()
        })

        // Convert JavaScript object to JSON string
        const jsonData = JSON.stringify(contents, null, 2)
        // Upload JSON to Vercel Blob
        const blob = await put('output/equipment.json', jsonData, {access: 'public', addRandomSuffix: false});
        return blob  
    }catch(e){
        console.log(e)
    }finally{
        await browser.close()
    }
}

export async function fetchHeroDetails(offset = 0, limit = 40){
    if(limit <= 0) return
    
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 5,
        workerCreationDelay: 200,
        puppeteer,
        puppeteerOptions: {
            headless: Chromium.headless,
            args: [
                ...Chromium.args,
                '--no-sandbox', 
                '--disable-gpu', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas'
            ],
            defaultViewport: Chromium.defaultViewport,
            executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar"),
        }
    })

    // Event handler to be called in case of problems
    cluster.on('taskerror', (err, data) => {
        console.log(`Error crawling ${data.hero.name}: ${err.message}`);
    });

    let heroDetails = []
    await cluster.task(async({ page, data: { hero, url } }) => {
        page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
        page.setDefaultTimeout(DEFAULT_TIMEOUT)
        // Enable request interception
        await page.setRequestInterception(true);
        // Intercept and block video, styles, and font files
        page.on('request', (request) => {
            if (['stylesheet', 'font', 'media'].includes(request.resourceType())) {
                request.abort();  // Block files
            } else {
                request.continue();  // Allow other resources
            }
        });

        // Navigate to the webpage
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
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

        heroDetails.push({
            ...hero, 
            ...heroDetail, 
            skills
        })
        await page.close()
    })

    const { url } = head("output/hero.json")
    const heroList = await fetch(url).then(res => res.json())
    const start = Math.max(offset, 0)
    const end = start + limit
    heroList.slice(start, end).forEach(
        (hero) => cluster.queue({ hero: hero, url: `${SCRAPER_BASE_URL}/wiki/${encodeURIComponent(hero.hero_name.split(' ').join('_'))}` })
    )

    await cluster.idle()
    // Upload to blob storage for each JSON object
    await Promise.all(heroDetails.map(async(heroDetail) => (
        await put(`output/hero/${heroDetail.id}.json`, JSON.stringify(heroDetail), { access: 'public', addRandomSuffix: false })
    )))

    await cluster.close()
}

export async function fetchEquipmentDetails(offset = 0, limit = 40){
    if(limit <= 0) return

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 5,
        workerCreationDelay: 200,
        puppeteer,
        puppeteerOptions: {
            headless: true,
            args: [
                ...Chromium.args,
                '--no-sandbox', 
                '--disable-gpu', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas'
            ],
            defaultViewport: Chromium.defaultViewport,
            executablePath: await Chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar"),
        }
    })

    // Event handler to be called in case of problems
    cluster.on('taskerror', (err, data) => {
        console.log(`Error crawling ${data}: ${err.message}`);
    });

    let equipmentDetails = []
    await cluster.task(async({ page, data: {id, url} }) => {
        page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
        page.setDefaultTimeout(DEFAULT_TIMEOUT)
        // Enable request interception
        await page.setRequestInterception(true);
        // Intercept and block video, stles, and font files
        page.on('request', (request) => {
            if (['stylesheet', 'font', 'media'].includes(request.resourceType())) {
                request.abort();  // Block files
            } else {
                request.continue();  // Allow other resources
            }
        });

        // Navigate to the webpage
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        const equipmentDetail = await page.evaluate(() => {
            // General Attributes
            const item_name = document.querySelector('[data-source="title1"]')
            const image = document.querySelector('#mw-content-text > div.mw-parser-output > aside > figure > a > img')
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
                icon: image?.src.split("/revision/latest")[0],
                item_name: item_name?.innerText.trim() ?? "",
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
        equipmentDetails.push({id: id, ...equipmentDetail})
        await page.close()
    })

    const { url } = head("output/equipment.json")
    const equipmentList = await fetch(url).then(res => res.json())
    const start = Math.max(offset, 0)
    const end = start + limit
    equipmentList.slice(start, end).forEach(
        (equipment) => cluster.queue({ id: equipment.id, url: `${SCRAPER_BASE_URL}/wiki/${encodeURIComponent(equipment.name.split(' ').join('_'))}`})
    )

    await cluster.idle()
    // Upload to blob storage for each JSON object
    await Promise.all(equipmentDetails.map(async(equipmentDetail) => (
        await put(`output/equipment/${equipmentDetail.id}.json`, JSON.stringify(equipmentDetail), { access: 'public', addRandomSuffix: false })
    )))

    await cluster.close()
}