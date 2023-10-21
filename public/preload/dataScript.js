(() => {
    const username = document.getElementsByClassName('grow overflow-hidden text-ellipsis whitespace-nowrap text-left text-gray-700 dark:text-white font-semibold')[0].innerText;
    const elements = [...document.getElementsByClassName('flex flex-col text-sm dark:bg-gray-800')];
    let data = [];

    for (let el of elements) {
        let element = el.cloneNode(true);

        let headers = element.querySelectorAll('header');
        headers.forEach(header => header.parentNode.removeChild(header));

        let strongElements = element.querySelectorAll('strong');
        strongElements.forEach(strongEl => {
            strongEl.outerHTML = `**${strongEl.innerText}**`;
        });

        let removeElements = element.querySelectorAll('.flex-grow.flex-shrink-0.tabular-nums');
        removeElements.forEach(removeEl => {
            removeEl.parentNode.removeChild(removeEl);
        });

        let DALLE3_title = element.querySelectorAll('.truncate.font-medium');
        DALLE3_title.forEach(targetEl => {
            targetEl.innerText += '\t';
        });

        let gapElements = element.getElementsByClassName('flex flex-col items-start gap-2');
        [...gapElements].forEach(gapEl => {
            gapEl.innerHTML = '\n' + gapEl.innerHTML + '\n';
        });

        let imgElements = element.querySelectorAll('img.transition-opacity.duration-300.opacity-100');
        let imgArray = [];
        let imgPlaceholders = [];
        [...imgElements].forEach((imgEl, index) => {
            let src = imgEl.getAttribute('src');
            let markdownImg = `<img src="${src}" style="zoom: 25%;" />`
            imgArray.push(markdownImg);
            let placeholder = `IMG_PLACEHOLDER_${index}`;
            imgPlaceholders.push(placeholder);
            imgEl.outerHTML = placeholder;
        });

        let specifiedElements = element.getElementsByClassName('group w-full text-token-text-primary border-b border-black/10 gizmo:border-0 dark:border-gray-900/50 gizmo:dark:border-0 gizmo:bg-transparent dark:bg-gray-800 gizmo:dark:bg-transparent');
        [...specifiedElements].forEach(specifiedEl => {
            specifiedEl.innerHTML += '\n\n';
        });

        let specifiedElements_two = element.getElementsByClassName('p-4 justify-center text-base md:gap-6 md:py-6 m-auto');
        [...specifiedElements_two].forEach(specifiedEl => {
            specifiedEl.innerHTML += '\n\n\n';
        });

        let targetElements = element.getElementsByClassName('text-white flex justify-center items-center relative tracking-widest bg-blue-300 h-[36px] w-[36px] text-sm rounded-sm');
        [...targetElements].forEach(targetEl => {
            targetEl.innerHTML = '## ' + username + ' ##' + '\n';
        });

        let botElements = element.getElementsByClassName('relative p-1 rounded-sm h-9 w-9 text-white flex items-center justify-center');
        [...botElements].forEach(targetEl => {
            targetEl.innerHTML = '## ChatGPT ##';
        });

        // Save codeBlocks first
        let codeBlocksData = [];
        let codeBlocks = element.querySelectorAll('.bg-black.rounded-md.mb-4');
        codeBlocks.forEach(block => {
            let langMatch = block.innerHTML.match(/language-(\w+)/);
            let lang = langMatch ? langMatch[1] : 'text\n';
            let blockText = block.innerHTML.split('\n').map(line => line.includes('Copy code') ? line.split('Copy code')[1] : line).join('\n');
            let markdownCode = '\n\n\`\`\`' + lang + '\n' + blockText + '\n\`\`\`\n';
            codeBlocksData.push(markdownCode);
            block.outerHTML = `CODEBLOCK_PLACEHOLDER_${codeBlocksData.length - 1}`;
        });

        let tempDiv = document.createElement("div");
        tempDiv.innerHTML = element.innerHTML.replace(/<br>/g, '\n').replace(/<p>/g, '\n').replace(/<\/p>/g, '\n');

        let olElements = tempDiv.getElementsByTagName('ol');
        for (let ol of olElements) {
            let liElements = ol.getElementsByTagName('li');
            for (let j = 0; j < liElements.length; j++) {
                let firstP = liElements[j].getElementsByTagName('p')[0];
                if (firstP) {
                    firstP.outerHTML = firstP.outerHTML + '\n\n';
                }
                liElements[j].innerHTML = (j + 1) + '. ' + liElements[j].innerHTML;
            }
            ol.innerHTML = ol.innerHTML.replace(/<li>/g, '\n').replace(/<\/li>/g, '') + '\n';
        }

        let ulElements = tempDiv.getElementsByTagName('ul');
        for (let ul of ulElements) {
            let liElements = ul.getElementsByTagName('li');
            for (let j = 0; j < liElements.length; j++) {
                let firstP = liElements[j].getElementsByTagName('p')[0];
                if (firstP) {
                    firstP.outerHTML = firstP.outerHTML + '\n\n';
                }
                liElements[j].innerHTML = '* ' + liElements[j].innerHTML;
            }
            ul.innerHTML = ul.innerHTML.replace(/<li>/g, '\n').replace(/<\/li>/g, '') + '\n';
        }

        // Restore codeBlocks
        codeBlocksData.forEach((codeBlock, index) => {
            tempDiv.innerHTML = tempDiv.innerHTML.replace(`CODEBLOCK_PLACEHOLDER_${index}`, codeBlock);
        });

        let text = tempDiv.innerText;
        imgPlaceholders.forEach((placeholder, index) => {
            text = text.replace(placeholder, imgArray[index]);
        });

        data.push(text);
    }

    return data;
})();
