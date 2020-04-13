define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createConfigDropdown = (sandbox, monaco) => {
        const configContainer = document.getElementById('config-container');
        const container = document.createElement('div');
        container.id = 'boolean-options-container';
        configContainer.appendChild(container);
        const compilerOpts = sandbox.getCompilerOptions();
        const boolOptions = Object.keys(compilerOpts).filter(k => typeof compilerOpts[k] === 'boolean');
        // we want to make sections of categories
        const categoryMap = {};
        boolOptions.forEach(optID => {
            const summary = optionsSummary.find(sum => optID === sum.id);
            const existingCategory = categoryMap[summary.categoryID];
            if (!existingCategory)
                categoryMap[summary.categoryID] = {};
            categoryMap[summary.categoryID][optID] = summary;
        });
        Object.keys(categoryMap).forEach(categoryID => {
            const categoryDiv = document.createElement('div');
            const header = document.createElement('h4');
            const ol = document.createElement('ol');
            Object.keys(categoryMap[categoryID]).forEach(optID => {
                const optSummary = categoryMap[categoryID][optID];
                header.textContent = optSummary.categoryDisplay;
                const li = document.createElement('li');
                const label = document.createElement('label');
                label.style.position = 'relative';
                label.style.width = '100%';
                const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="20px" height="20px" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"
            <circle id="Oval" stroke="#0B6F57" cx="10" cy="10" r="9"></circle>
            <path d="M9.99598394,6 C10.2048193,6 10.4243641,5.91700134 10.6546185,5.75100402 C10.8848728,5.58500669 11,5.33601071 11,5.00401606 C11,4.66666667 10.8848728,4.41499331 10.6546185,4.24899598 C10.4243641,4.08299866 10.2048193,4 9.99598394,4 C9.79250335,4 9.57563588,4.08299866 9.34538153,4.24899598 C9.11512718,4.41499331 9,4.66666667 9,5.00401606 C9,5.33601071 9.11512718,5.58500669 9.34538153,5.75100402 C9.57563588,5.91700134 9.79250335,6 9.99598394,6 Z M10.6877323,16 L10.6877323,14.8898836 L10.6877323,8 L9.30483271,8 L9.30483271,9.11011638 L9.30483271,16 L10.6877323,16 Z" id="i" fill="#0B6F57" fill-rule="nonzero"></path>
          </g>
      </svg>`;
                label.innerHTML = `<span>${optSummary.id}</span><a href='../tsconfig#${optSummary.id}' class='compiler_info_link' alt='Look up ${optSummary.id} in the TSConfig Reference'>${svg}</a><br/>${optSummary.oneliner}`;
                const input = document.createElement('input');
                input.value = optSummary.id;
                input.type = 'checkbox';
                input.name = optSummary.id;
                input.id = 'option-' + optSummary.id;
                input.onchange = () => {
                    sandbox.updateCompilerSetting(optSummary.id, input.checked);
                };
                label.htmlFor = input.id;
                li.appendChild(input);
                li.appendChild(label);
                ol.appendChild(li);
            });
            categoryDiv.appendChild(header);
            categoryDiv.appendChild(ol);
            container.appendChild(categoryDiv);
        });
        const dropdownContainer = document.getElementById('compiler-dropdowns');
        const target = optionsSummary.find(sum => sum.id === 'target');
        const targetSwitch = createSelect(target.display, 'target', target.oneliner, sandbox, monaco.languages.typescript.ScriptTarget);
        dropdownContainer.appendChild(targetSwitch);
        const jsx = optionsSummary.find(sum => sum.id === 'jsx');
        const jsxSwitch = createSelect(jsx.display, 'jsx', jsx.oneliner, sandbox, monaco.languages.typescript.JsxEmit);
        dropdownContainer.appendChild(jsxSwitch);
        const modSum = optionsSummary.find(sum => sum.id === 'module');
        const moduleSwitch = createSelect(modSum.display, 'module', modSum.oneliner, sandbox, monaco.languages.typescript.ModuleKind);
        dropdownContainer.appendChild(moduleSwitch);
    };
    exports.updateConfigDropdownForCompilerOptions = (sandbox, monaco) => {
        const compilerOpts = sandbox.getCompilerOptions();
        const boolOptions = Object.keys(compilerOpts).filter(k => typeof compilerOpts[k] === 'boolean');
        boolOptions.forEach(opt => {
            const inputID = 'option-' + opt;
            const input = document.getElementById(inputID);
            input.checked = !!compilerOpts[opt];
        });
        const compilerIDToMaps = {
            module: monaco.languages.typescript.ModuleKind,
            jsx: monaco.languages.typescript.JsxEmit,
            target: monaco.languages.typescript.ScriptTarget,
        };
        Object.keys(compilerIDToMaps).forEach(flagID => {
            const input = document.getElementById('compiler-select-' + flagID);
            const currentValue = compilerOpts[flagID];
            const map = compilerIDToMaps[flagID];
            // @ts-ignore
            const realValue = map[currentValue];
            // @ts-ignore
            for (const option of input.children) {
                option.selected = option.value.toLowerCase() === realValue.toLowerCase();
            }
        });
    };
    const createSelect = (title, id, blurb, sandbox, option) => {
        const label = document.createElement('label');
        const textToDescribe = document.createElement('span');
        textToDescribe.textContent = title + ':';
        label.appendChild(textToDescribe);
        const select = document.createElement('select');
        select.id = 'compiler-select-' + id;
        label.appendChild(select);
        select.onchange = () => {
            const value = select.value; // the human string
            const compilerIndex = option[value];
            sandbox.updateCompilerSetting(id, compilerIndex);
        };
        Object.keys(option)
            .filter(key => isNaN(Number(key)))
            .forEach(key => {
            // hide Latest
            if (key === 'Latest')
                return;
            const option = document.createElement('option');
            option.value = key;
            option.text = key;
            select.appendChild(option);
        });
        const span = document.createElement('span');
        span.textContent = blurb;
        span.classList.add('compiler-flag-blurb');
        label.appendChild(span);
        return label;
    };
    exports.setupJSONToggleForConfig = (sandbox) => { };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlQ29uZmlnRHJvcGRvd24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9jcmVhdGVDb25maWdEcm9wZG93bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7SUFhYSxRQUFBLG9CQUFvQixHQUFHLENBQUMsT0FBZ0IsRUFBRSxNQUFjLEVBQUUsRUFBRTtRQUN2RSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFFLENBQUE7UUFDcEUsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMvQyxTQUFTLENBQUMsRUFBRSxHQUFHLDJCQUEyQixDQUFBO1FBQzFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFdEMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQTtRQUUvRix5Q0FBeUM7UUFDekMsTUFBTSxXQUFXLEdBQUcsRUFBaUUsQ0FBQTtRQUNyRixXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzFCLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBRSxDQUFBO1lBRTdELE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN4RCxJQUFJLENBQUMsZ0JBQWdCO2dCQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBRTNELFdB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RyxDQUFBO1lBQ2xCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFBO1lBRWpCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUIsQ0FBQyxDQUFDLENBQUE7UUFFSixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDekMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV2QixPQUFPLEtBQUssQ0FBQTtJQUNkLENBQUMsQ0FBQTtJQUVZLFFBQUEsd0JBQXdCLEdBQUcsQ0FBQyxPQUFnQixFQUFFLEVBQUUsR0FBRSxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJ0eXBlIFNhbmRib3ggPSBpbXBvcnQoJ3R5cGVzY3JpcHQtc2FuZGJveCcpLlNhbmRib3hcbnR5cGUgTW9uYWNvID0gdHlwZW9mIGltcG9ydCgnbW9uYWNvLWVkaXRvcicpXG5cbnR5cGUgT3B0aW9uc1N1bW1hcnkgPSB7XG4gIGRpc3BsYXk6IHN0cmluZ1xuICBvbmVsaW5lcjogc3RyaW5nXG4gIGlkOiBzdHJpbmdcbiAgY2F0ZWdvcnlJRDogc3RyaW5nXG4gIGNhdGVnb3J5RGlzcGxheTogc3RyaW5nXG59XG5cbmRlY2xhcmUgY29uc3Qgb3B0aW9uc1N1bW1hcnk6IE9wdGlvbnNTdW1tYXJ5W11cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUNvbmZpZ0Ryb3Bkb3duID0gKHNhbmRib3g6IFNhbmRib3gsIG1vbmFjbzogTW9uYWNvKSA9PiB7XG4gIGNvbnN0IGNvbmZpZ0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb25maWctY29udGFpbmVyJykhXG4gIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIGNvbnRhaW5lci5pZCA9ICdib29sZWFuLW9wdGlvbnMtY29udGFpbmVyJ1xuICBjb25maWdDb250YWluZXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyKVxuXG4gIGNvbnN0IGNvbXBpbGVyT3B0cyA9IHNhbmRib3guZ2V0Q29tcGlsZXJPcHRpb25zKClcbiAgY29uc3QgYm9vbE9wdGlvbnMgPSBPYmplY3Qua2V5cyhjb21waWxlck9wdHMpLmZpbHRlcihrID0+IHR5cGVvZiBjb21waWxlck9wdHNba10gPT09ICdib29sZWFuJylcblxuICAvLyB3ZSB3YW50IHRvIG1ha2Ugc2VjdGlvbnMgb2YgY2F0ZWdvcmllc1xuICBjb25zdCBjYXRlZ29yeU1hcCA9IHt9IGFzIHsgW2NhdGVnb3J5OiBzdHJpbmddOiB7IFtvcHRJRDogc3RyaW5nXTogT3B0aW9uc1N1bW1hcnkgfSB9XG4gIGJvb2xPcHRpb25zLmZvckVhY2gob3B0SUQgPT4ge1xuICAgIGNvbnN0IHN1bW1hcnkgPSBvcHRpb25zU3VtbWFyeS5maW5kKHN1bSA9PiBvcHRJRCA9PT0gc3VtLmlkKSFcblxuICAgIGNvbnN0IGV4aXN0aW5nQ2F0ZWdvcnkgPSBjYXRlZ29yeU1hcFtzdW1tYXJ5LmNhdGVnb3J5SURdXG4gICAgaWYgKCFleGlzdGluZ0NhdGVnb3J5KSBjYXRlZ29yeU1hcFtzdW1tYXJ5LmNhdGVnb3J5SURdID0ge31cblxuICAgIGNhdGVnb3J5TWFwW3N1bW1hcnkuY2F0ZWdvcnlJRF1bb3B0SURdID0gc3VtbWFyeVxuICB9KVxuXG4gIE9iamVjdC5rZXlzKGNhdGVnb3J5TWFwKS5mb3JFYWNoKGNhdGVnb3J5SUQgPT4ge1xuICAgIGNvbnN0IGNhdGVnb3J5RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBjb25zdCBoZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoNCcpXG4gICAgY29uc3Qgb2wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvbCcpXG5cbiAgICBPYmplY3Qua2V5cyhjYXRlZ29yeU1hcFtjYXRlZ29yeUlEXSkuZm9yRWFjaChvcHRJRCA9PiB7XG4gICAgICBjb25zdCBvcHRTdW1tYXJ5ID0gY2F0ZWdvcnlNYXBbY2F0ZWdvcnlJRF1bb3B0SURdXG4gICAgICBoZWFkZXIudGV4dENvbnRlbnQgPSBvcHRTdW1tYXJ5LmNhdGVnb3J5RGlzcGxheVxuXG4gICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJylcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKVxuICAgICAgbGFiZWwuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnXG4gICAgICBsYWJlbC5zdHlsZS53aWR0aCA9ICcxMDAlJ1xuXG4gICAgICBjb25zdCBzdmcgPSBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+PHN2ZyB3aWR0aD1cIjIwcHhcIiBoZWlnaHQ9XCIyMHB4XCIgdmlld0JveD1cIjAgMCAyMCAyMFwiIHZlcnNpb249XCIxLjFcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCI+XG4gICAgICAgICAgPGcgc3Ryb2tlPVwibm9uZVwiIHN0cm9rZS13aWR0aD1cIjFcIiBmaWxsPVwibm9uZVwiIGZpbGwtcnVsZT1cImV2ZW5vZGRcIlxuICAgICAgICAgICAgPGNpcmNsZSBpZD1cIk92YWxcIiBzdHJva2U9XCIjMEI2RjU3XCIgY3g9XCIxMFwiIGN5PVwiMTBcIiByPVwiOVwiPjwvY2lyY2xlPlxuICAgICAgICAgICAgPHBhdGggZD1cIk05Ljk5NTk4Mzk0LDYgQzEwLjIwNDgxOTMsNiAxMC40MjQzNjQxLDUuOTE3MDAxMzQgMTAuNjU0NjE4NSw1Ljc1MTAwNDAyIEMxMC44ODQ4NzI4LDUuNTg1MDA2NjkgMTEsNS4zMzYwMTA3MSAxMSw1LjAwNDAxNjA2IEMxMSw0LjY2NjY2NjY3IDEwLjg4NDg3MjgsNC40MTQ5OTMzMSAxMC42NTQ2MTg1LDQuMjQ4OTk1OTggQzEwLjQyNDM2NDEsNC4wODI5OTg2NiAxMC4yMDQ4MTkzLDQgOS45OTU5ODM5NCw0IEM5Ljc5MjUwMzM1LDQgOS41NzU2MzU4OCw0LjA4Mjk5ODY2IDkuMzQ1MzgxNTMsNC4yNDg5OTU5OCBDOS4xMTUxMjcxOCw0LjQxNDk5MzMxIDksNC42NjY2NjY2NyA5LDUuMDA0MDE2MDYgQzksNS4zMzYwMTA3MSA5LjExNTEyNzE4LDUuNTg1MDA2NjkgOS4zNDUzODE1Myw1Ljc1MTAwNDAyIEM5LjU3NTYzNTg4LDUuOTE3MDAxMzQgOS43OTI1MDMzNSw2IDkuOTk1OTgzOTQsNiBaIE0xMC42ODc3MzIzLDE2IEwxMC42ODc3MzIzLDE0Ljg4OTg4MzYgTDEwLjY4NzczMjMsOCBMOS4zMDQ4MzI3MSw4IEw5LjMwNDgzMjcxLDkuMTEwMTE2MzggTDkuMzA0ODMyNzEsMTYgTDEwLjY4NzczMjMsMTYgWlwiIGlkPVwiaVwiIGZpbGw9XCIjMEI2RjU3XCIgZmlsbC1ydWxlPVwibm9uemVyb1wiPjwvcGF0aD5cbiAgICAgICAgICA8L2c+XG4gICAgICA8L3N2Zz5gXG4gICAgICBsYWJlbC5pbm5lckhUTUwgPSBgPHNwYW4+JHtvcHRTdW1tYXJ5LmlkfTwvc3Bhbj48YSBocmVmPScuLi90c2NvbmZpZyMke29wdFN1bW1hcnkuaWR9JyBjbGFzcz0nY29tcGlsZXJfaW5mb19saW5rJyBhbHQ9J0xvb2sgdXAgJHtvcHRTdW1tYXJ5LmlkfSBpbiB0aGUgVFNDb25maWcgUmVmZXJlbmNlJz4ke3N2Z308L2E+PGJyLz4ke29wdFN1bW1hcnkub25lbGluZXJ9YFxuXG4gICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JylcbiAgICAgIGlucHV0LnZhbHVlID0gb3B0U3VtbWFyeS5pZFxuICAgICAgaW5wdXQudHlwZSA9ICdjaGVja2JveCdcbiAgICAgIGlucHV0Lm5hbWUgPSBvcHRTdW1tYXJ5LmlkXG4gICAgICBpbnB1dC5pZCA9ICdvcHRpb24tJyArIG9wdFN1bW1hcnkuaWRcblxuICAgICAgaW5wdXQub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgIHNhbmRib3gudXBkYXRlQ29tcGlsZXJTZXR0aW5nKG9wdFN1bW1hcnkuaWQsIGlucHV0LmNoZWNrZWQpXG4gICAgICB9XG5cbiAgICAgIGxhYmVsLmh0bWxGb3IgPSBpbnB1dC5pZFxuXG4gICAgICBsaS5hcHBlbmRDaGlsZChpbnB1dClcbiAgICAgIGxpLmFwcGVuZENoaWxkKGxhYmVsKVxuICAgICAgb2wuYXBwZW5kQ2hpbGQobGkpXG4gICAgfSlcblxuICAgIGNhdGVnb3J5RGl2LmFwcGVuZENoaWxkKGhlYWRlcilcbiAgICBjYXRlZ29yeURpdi5hcHBlbmRDaGlsZChvbClcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2F0ZWdvcnlEaXYpXG4gIH0pXG5cbiAgY29uc3QgZHJvcGRvd25Db250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29tcGlsZXItZHJvcGRvd25zJykhXG5cbiAgY29uc3QgdGFyZ2V0ID0gb3B0aW9uc1N1bW1hcnkuZmluZChzdW0gPT4gc3VtLmlkID09PSAndGFyZ2V0JykhXG4gIGNvbnN0IHRhcmdldFN3aXRjaCA9IGNyZWF0ZVNlbGVjdChcbiAgICB0YXJnZXQuZGlzcGxheSxcbiAgICAndGFyZ2V0JyxcbiAgICB0YXJnZXQub25lbGluZXIsXG4gICAgc2FuZGJveCxcbiAgICBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuU2NyaXB0VGFyZ2V0XG4gIClcbiAgZHJvcGRvd25Db250YWluZXIuYXBwZW5kQ2hpbGQodGFyZ2V0U3dpdGNoKVxuXG4gIGNvbnN0IGpzeCA9IG9wdGlvbnNTdW1tYXJ5LmZpbmQoc3VtID0+IHN1bS5pZCA9PT0gJ2pzeCcpIVxuICBjb25zdCBqc3hTd2l0Y2ggPSBjcmVhdGVTZWxlY3QoanN4LmRpc3BsYXksICdqc3gnLCBqc3gub25lbGluZXIsIHNhbmRib3gsIG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5Kc3hFbWl0KVxuICBkcm9wZG93bkNvbnRhaW5lci5hcHBlbmRDaGlsZChqc3hTd2l0Y2gpXG5cbiAgY29uc3QgbW9kU3VtID0gb3B0aW9uc1N1bW1hcnkuZmluZChzdW0gPT4gc3VtLmlkID09PSAnbW9kdWxlJykhXG4gIGNvbnN0IG1vZHVsZVN3aXRjaCA9IGNyZWF0ZVNlbGVjdChcbiAgICBtb2RTdW0uZGlzcGxheSxcbiAgICAnbW9kdWxlJyxcbiAgICBtb2RTdW0ub25lbGluZXIsXG4gICAgc2FuZGJveCxcbiAgICBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuTW9kdWxlS2luZFxuICApXG4gIGRyb3Bkb3duQ29udGFpbmVyLmFwcGVuZENoaWxkKG1vZHVsZVN3aXRjaClcbn1cblxuZXhwb3J0IGNvbnN0IHVwZGF0ZUNvbmZpZ0Ryb3Bkb3duRm9yQ29tcGlsZXJPcHRpb25zID0gKHNhbmRib3g6IFNhbmRib3gsIG1vbmFjbzogTW9uYWNvKSA9PiB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0cyA9IHNhbmRib3guZ2V0Q29tcGlsZXJPcHRpb25zKClcbiAgY29uc3QgYm9vbE9wdGlvbnMgPSBPYmplY3Qua2V5cyhjb21waWxlck9wdHMpLmZpbHRlcihrID0+IHR5cGVvZiBjb21waWxlck9wdHNba10gPT09ICdib29sZWFuJylcblxuICBib29sT3B0aW9ucy5mb3JFYWNoKG9wdCA9PiB7XG4gICAgY29uc3QgaW5wdXRJRCA9ICdvcHRpb24tJyArIG9wdFxuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaW5wdXRJRCkgYXMgSFRNTElucHV0RWxlbWVudFxuICAgIGlucHV0LmNoZWNrZWQgPSAhIWNvbXBpbGVyT3B0c1tvcHRdXG4gIH0pXG5cbiAgY29uc3QgY29tcGlsZXJJRFRvTWFwczogYW55ID0ge1xuICAgIG1vZHVsZTogbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0Lk1vZHVsZUtpbmQsXG4gICAganN4OiBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuSnN4RW1pdCxcbiAgICB0YXJnZXQ6IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5TY3JpcHRUYXJnZXQsXG4gIH1cblxuICBPYmplY3Qua2V5cyhjb21waWxlcklEVG9NYXBzKS5mb3JFYWNoKGZsYWdJRCA9PiB7XG4gICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29tcGlsZXItc2VsZWN0LScgKyBmbGFnSUQpIGFzIEhUTUxJbnB1dEVsZW1lbnRcbiAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBjb21waWxlck9wdHNbZmxhZ0lEXVxuICAgIGNvbnN0IG1hcCA9IGNvbXBpbGVySURUb01hcHNbZmxhZ0lEXVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBjb25zdCByZWFsVmFsdWUgPSBtYXBbY3VycmVudFZhbHVlXVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBpbnB1dC5jaGlsZHJlbikge1xuICAgICAgb3B0aW9uLnNlbGVjdGVkID0gb3B0aW9uLnZhbHVlLnRvTG93ZXJDYXNlKCkgPT09IHJlYWxWYWx1ZS50b0xvd2VyQ2FzZSgpXG4gICAgfVxuICB9KVxufVxuXG5jb25zdCBjcmVhdGVTZWxlY3QgPSAodGl0bGU6IHN0cmluZywgaWQ6IHN0cmluZywgYmx1cmI6IHN0cmluZywgc2FuZGJveDogU2FuZGJveCwgb3B0aW9uOiBhbnkpID0+IHtcbiAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpXG4gIGNvbnN0IHRleHRUb0Rlc2NyaWJlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gIHRleHRUb0Rlc2NyaWJlLnRleHRDb250ZW50ID0gdGl0bGUgKyAnOidcbiAgbGFiZWwuYXBwZW5kQ2hpbGQodGV4dFRvRGVzY3JpYmUpXG5cbiAgY29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VsZWN0JylcbiAgc2VsZWN0LmlkID0gJ2NvbXBpbGVyLXNlbGVjdC0nICsgaWRcbiAgbGFiZWwuYXBwZW5kQ2hpbGQoc2VsZWN0KVxuXG4gIHNlbGVjdC5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IHNlbGVjdC52YWx1ZSAvLyB0aGUgaHVtYW4gc3RyaW5nXG4gICAgY29uc3QgY29tcGlsZXJJbmRleCA9IG9wdGlvblt2YWx1ZV1cbiAgICBzYW5kYm94LnVwZGF0ZUNvbXBpbGVyU2V0dGluZyhpZCwgY29tcGlsZXJJbmRleClcbiAgfVxuXG4gIE9iamVjdC5rZXlzKG9wdGlvbilcbiAgICAuZmlsdGVyKGtleSA9PiBpc05hTihOdW1iZXIoa2V5KSkpXG4gICAgLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIC8vIGhpZGUgTGF0ZXN0XG4gICAgICBpZiAoa2V5ID09PSAnTGF0ZXN0JykgcmV0dXJuXG5cbiAgICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpXG4gICAgICBvcHRpb24udmFsdWUgPSBrZXlcbiAgICAgIG9wdGlvbi50ZXh0ID0ga2V5XG5cbiAgICAgIHNlbGVjdC5hcHBlbmRDaGlsZChvcHRpb24pXG4gICAgfSlcblxuICBjb25zdCBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpXG4gIHNwYW4udGV4dENvbnRlbnQgPSBibHVyYlxuICBzcGFuLmNsYXNzTGlzdC5hZGQoJ2NvbXBpbGVyLWZsYWctYmx1cmInKVxuICBsYWJlbC5hcHBlbmRDaGlsZChzcGFuKVxuXG4gIHJldHVybiBsYWJlbFxufVxuXG5leHBvcnQgY29uc3Qgc2V0dXBKU09OVG9nZ2xlRm9yQ29uZmlnID0gKHNhbmRib3g6IFNhbmRib3gpID0+IHt9XG4iXX0=