import puppeteer from "puppeteer-core";
import Chromium from "@sparticuz/chromium-min";
import { put } from "@vercel/blob";
import { wait, convertToJsonAttribute } from "./helper";
import { SCRAPER_BASE_URL, DEFAULT_NAVIGATION_TIMEOUT, DEFAULT_TIMEOUT } from "./const";

Chromium.setHeadlessMode = true,
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
            const rows = Array.from(document.querySelectorAll('.fandom-table thead tr')); // Adjust if your table has a specific class or ID
            
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
            const rows = Array.from(document.querySelectorAll('.fandom-table tbody tr')); // Adjust if your table has a specific class or ID

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

    try{
        // Navigate to the webpage
        await page.goto(`${SCRAPER_BASE_URL}/wiki/Equipment`, { waitUntil: 'domcontentloaded' });
    
        // Scroll back to top
        await page.evaluate(_ => {
            document.getElementById('List_of_equipment').scrollIntoView(true)
        });
    
    
        const tabs = await page.$$(".tabber-2 .wds-tabs .wds-tabs__tab:not(wds-is-current)")
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