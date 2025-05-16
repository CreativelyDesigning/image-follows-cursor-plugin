document.addEventListener("DOMContentLoaded", function () {
    function setupHoverImages() {
        const sections = document.querySelectorAll('section[id*="img-hover"]');
        if (sections.length === 0) return;

        const hoverImagesContainer = document.createElement('div');
        hoverImagesContainer.className = 'hover-images-container';
        hoverImagesContainer.style.position = 'fixed';
        hoverImagesContainer.style.pointerEvents = 'none';
        hoverImagesContainer.style.zIndex = '100';
        hoverImagesContainer.style.top = '0';
        hoverImagesContainer.style.left = '0';
        document.body.appendChild(hoverImagesContainer);

        const configuredPairs = [];
        sections.forEach((section) => {
            const listItems = section.querySelectorAll('li.list-item');
            if (listItems.length === 0) return;

            listItems.forEach((listItem, index) => {
                const originalImg = listItem.querySelector('.list-item-media img');
                if (!originalImg) return;

                const imageSrc = originalImg.getAttribute('src') || originalImg.getAttribute('data-src');
                if (!imageSrc) return;

                const hoverImage = document.createElement('img');
                hoverImage.className = 'hover-image';
                hoverImage.src = imageSrc;
                hoverImage.alt = originalImg.alt || '';

                const originalRect = originalImg.getBoundingClientRect();
                hoverImage.style.width = originalRect.width + 'px';
                hoverImage.style.height = originalRect.height + 'px';

                hoverImagesContainer.appendChild(hoverImage);

                const pairId = `hover-pair-${section.id}-${index}`;
                configuredPairs.push({
                    triggerId: pairId,
                    triggerElement: listItem,
                    imageElement: hoverImage
                });
            });
        });
        return configuredPairs;
    }

    const triggerElements = {};
    const imageElements = {};
    let currentVisibleImage = null;
    let currentTriggerElement = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let lagFactor = 0.1;
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    function throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = new Date().getTime();
            if (now - lastCall < delay) return;
            lastCall = now;
            return func(...args);
        };
    }

    function prePositionImagesForTouch() {
        if (!isTouchDevice) return;
        Object.values(imageElements).forEach(img => {
            img.style.left = '50%';
            img.style.top = '50vh';
            img.style.transform = 'translate(-50%, -50%)';
        });
    }

    function updateImagePositionWithLag(imageElement) {
        if (!imageElement || isTouchDevice) return;
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        currentX += dx * lagFactor;
        currentY += dy * lagFactor;
        imageElement.style.left = currentX + 'px';
        imageElement.style.top = currentY + 'px';
    }

    function updateTargetPosition(e) {
        if (isTouchDevice) return;
        const offsetX = -150;
        const offsetY = -150;
        targetX = e.clientX + offsetX;
        targetY = e.clientY + offsetY;
    }

    function getElementVisibilityScore(element) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const elementCenter = rect.top + rect.height / 2;
        const windowCenter = windowHeight / 2;
        const distance = Math.abs(elementCenter - windowCenter) / windowHeight;
        return Math.max(0, 1 - distance * 2);
    }

    function findMostCenteredTrigger() {
        let bestScore = -1;
        let bestTrigger = null;
        Object.keys(triggerElements).forEach(triggerId => {
            const element = triggerElements[triggerId];
            const score = getElementVisibilityScore(element);
            if (score > 0.5 && score > bestScore) {
                bestScore = score;
                bestTrigger = triggerId;
            }
        });
        return bestTrigger;
    }

    function updateTouchVisibility() {
        if (!isTouchDevice) return;
        const mostCenteredTrigger = findMostCenteredTrigger();
        if (!mostCenteredTrigger) {
            if (currentVisibleImage) {
                currentVisibleImage.classList.remove("visible");
                currentVisibleImage = null;
                currentTriggerElement = null;
            }
            return;
        }
        const imageElement = imageElements[mostCenteredTrigger];
        if (mostCenteredTrigger !== currentTriggerElement && imageElement) {
            if (currentVisibleImage) {
                currentVisibleImage.classList.remove("visible");
            }
            imageElement.classList.add("visible");
            currentVisibleImage = imageElement;
            currentTriggerElement = mostCenteredTrigger;
        }
    }

    function animationLoop() {
        if (!isTouchDevice && currentVisibleImage) {
            updateImagePositionWithLag(currentVisibleImage);
        }
        requestAnimationFrame(animationLoop);
    }

    function initHoverEffect() {
        const configuredPairs = setupHoverImages();
        if (!configuredPairs || configuredPairs.length === 0) return;

        configuredPairs.forEach(pair => {
            triggerElements[pair.triggerId] = pair.triggerElement;
            imageElements[pair.triggerId] = pair.imageElement;
        });

        if (!isTouchDevice) {
            configuredPairs.forEach(pair => {
                const triggerElement = pair.triggerElement;
                const imageElement = pair.imageElement;
                const triggerId = pair.triggerId;

                triggerElement.addEventListener("mouseenter", (e) => {
                    targetX = e.clientX - 150;
                    targetY = e.clientY - 150;
                    currentX = targetX;
                    currentY = targetY;
                    imageElement.style.left = currentX + 'px';
                    imageElement.style.top = currentY + 'px';
                    if (currentVisibleImage) {
                        currentVisibleImage.classList.remove("visible");
                    }
                    imageElement.classList.add("visible");
                    currentVisibleImage = imageElement;
                    currentTriggerElement = triggerId;
                });

                triggerElement.addEventListener("mouseleave", () => {
                    imageElement.classList.remove("visible");
                    if (currentVisibleImage === imageElement) {
                        currentVisibleImage = null;
                        currentTriggerElement = null;
                    }
                });

                triggerElement.addEventListener("mousemove", updateTargetPosition);
            });

            const sections = document.querySelectorAll('section[id*="img-hover"]');
            sections.forEach(section => {
                section.addEventListener("mousemove", updateTargetPosition);
            });

            animationLoop();
        }

        prePositionImagesForTouch();

        if (isTouchDevice) {
            const throttledUpdate = throttle(updateTouchVisibility, 100);
            window.addEventListener("scroll", throttledUpdate);
            window.addEventListener("resize", throttledUpdate);
            setTimeout(updateTouchVisibility, 500);
        }
    }

    initHoverEffect();

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                let shouldReinitialize = false;
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if ((node.tagName === 'SECTION' && node.id && node.id.includes('img-hover')) || 
                            node.querySelector('section[id*="img-hover"]')) {
                            shouldReinitialize = true;
                        }
                    }
                });
                if (shouldReinitialize) {
                    setTimeout(() => {
                        const oldContainer = document.querySelector('.hover-images-container');
                        if (oldContainer) oldContainer.remove();
                        initHoverEffect();
                    }, 500);
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});

document.addEventListener("DOMContentLoaded", function() {
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    if (isTouchDevice) {
        function updateHoverImages() {
            const hoverImages = document.querySelectorAll('.hover-image');
            hoverImages.forEach(img => {
                img.style.aspectRatio = "1/1";
                img.style.height = "";
                img.style.maxHeight = "none";
            });
        }

        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    updateHoverImages();
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        updateHoverImages();
        setTimeout(updateHoverImages, 1000);
    }
});
// JavaScript Document