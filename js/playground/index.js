define(["require", "exports", "./sidebar/showJS", "./createElements", "./sidebar/showDTS", "./sidebar/runtime", "./exporter", "./createUI", "./getExample", "./monaco/ExampleHighlight", "./createConfigDropdown", "./sidebar/showErrors", "./sidebar/plugins", "./pluginUtils", "./sidebar/settings"], function (require, exports, showJS_1, createElements_1, showDTS_1, runtime_1, exporter_1, createUI_1, getExample_1, ExampleHighlight_1, createConfigDropdown_1, showErrors_1, plugins_1, pluginUtils_1, settings_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const defaultPluginFactories = [showJS_1.compiledJSPlugin, showDTS_1.showDTSPlugin, showErrors_1.showErrors, runtime_1.runPlugin, plugins_1.optionsPlugin];
    exports.setupPlayground = (sandbox, monaco, config, i, react) => {
        const playgroundParent = sandbox.getDomNode().parentElement.parentElement.parentElement;
        const dragBar = createElements_1.createDragBar();
        playgroundParent.appendChild(dragBar);
        const sidebar = createElements_1.createSidebar();
        playgroundParent.appendChild(sidebar);
        const tabBar = createElements_1.createTabBar();
        sidebar.appendChild(tabBar);
        const container = createElements_1.createPluginContainer();
        sidebar.appendChild(container);
        const plugins = [];
        const tabs = [];
        // Let's things like the workbench hook into tab changes
        let didUpdateTab;
        const registerPlugin = (plugin) => {
            plugins.push(plugin);
            const tab = createElements_1.createTabForPlugin(plugin);
            tabs.push(tab);
            const tabClicked = e => {
                const previousPlugin = getCurrentPlugin();
                const newTab = e.target;
                const newPlugin = plugins.find(p => p.displayName == newTab.textContent);
                createElements_1.activatePlugin(newPlugin, previousPlugin, sandbox, tabBar, container);
                didUpdateTab && didUpdateTab(newPlugin, previousPlugin);
            };
            tabBar.appendChild(tab);
            tab.onclick = tabClicked;
        };
        const setDidUpdateTab = (func) => {
            didUpdateTab = func;
        };
        const getCurrentPlugin = () => {
            const selectedTab = tabs.find(t => t.classList.contains("active"));
            return plugins[tabs.indexOf(selectedTab)];
        };
        const defaultPlugins = config.plugins || defaultPluginFactories;
        const utils = pluginUtils_1.createUtils(sandbox, react);
        const initialPlugins = defaultPlugins.map(f => f(i, utils));
        initialPlugins.forEach(p => registerPlugin(p));
        // Choose which should be selected
        const priorityPlugin = plugins.find(plugin => plugin.shouldBeSelected && plugin.shouldBeSelected());
        const selectedPlugin = priorityPlugin || plugins[0];
        const selectedTab = tabs[plugins.indexOf(selectedPlugin)];
        selectedTab.onclick({ target: selectedTab });
        let debouncingTimer = false;
        sandbox.editor.onDidChangeModelContent(_event => {
            const plugin = getCurrentPlugin();
            if (plugin.modelChanged)
                plugin.modelChanged(sandbox, sandbox.getModel(), container);
            // This needs to be last in the function
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                playgroundDebouncedMainFunction();
                // Only call the plugin function once every 0.3s
                if (plugin.modelChangedDebounce && plugin.displayName === getCurrentPlugin().displayName) {
                    console.log("Debounced", container);
                    plugin.modelChangedDebounce(sandbox, sandbox.getModel(), container);
                }
            }, 300);
        });
        // Sets the URL and storage of the sandbox string
        const playgroundDebouncedMainFunction = () => {
            const alwaysUpdateURL = !localStorage.getItem("disable-save-on-type");
            if (alwaysUpdateURL) {
                const newURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, "", newURL);
            }
            localStorage.setItem("sandbox-history", sandbox.getText());
        };
        // When any compiler flags are changed, trigger a potential change to the URL
        sandbox.setDidUpdateCompilerSettings(() => {
            playgroundDebouncedMainFunction();
            // @ts-ignore
            window.appInsights.trackEvent({ name: "Compiler Settings changed" });
            const model = sandbox.editor.getModel();
            const plugin = getCurrentPlugin();
            if (model && plugin.modelChanged)
                plugin.modelChanged(sandbox, model, container);
            if (model && plugin.modelChangedDebounce)
                plugin.modelChangedDebounce(sandbox, model, container);
        });
        // Setup working with the existing UI, once it's loaded
        // Versions of TypeScript
        // Set up the label for the dropdown
        document.querySelectorAll("#versions > a").item(0).innerHTML = "v" + sandbox.ts.version + " <span class='caret'/>";
        // Add the versions to the dropdown
        const versionsMenu = document.querySelectorAll("#versions > ul").item(0);
        const notWorkingInPlayground = ["3.1.6", "3.0.1", "2.8.1", "2.7.2", "2.4.1"];
        const allVersions = [
            "3.9.0-beta",
            ...sandbox.supportedVersions.filter(f => !notWorkingInPlayground.includes(f)),
            "Nightly",
        ];
        allVersions.forEach((v) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.textContent = v;
            a.href = "#";
            if (v === "Nightly") {
                li.classList.add("nightly");
            }
            if (v.toLowerCase().includes("beta")) {
                li.classList.add("beta");
            }
            li.onclick = () => {
                const currentURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                const params = new URLSearchParams(currentURL.split("#")[0]);
                const version = v === "Nightly" ? "next" : v;
                params.set("ts", version);
                const hash = document.location.hash.length ? document.location.hash : "";
                const newURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}?${params}${hash}`;
                // @ts-ignore - it is allowed
                document.location = newURL;
            };
            li.appendChild(a);
            versionsMenu.appendChild(li);
        });
        // Support dropdowns
        document.querySelectorAll(".navbar-sub li.dropdown > a").forEach(link => {
            const a = link;
            a.onclick = _e => {
                if (a.parentElement.classList.contains("open")) {
                    document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
                }
                else {
                    document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
                    a.parentElement.classList.toggle("open");
                    const exampleContainer = a.closest("li").getElementsByTagName("ul").item(0);
                    // Set exact height and widths for the popovers for the main playground navigation
                    const isPlaygroundSubmenu = !!a.closest("nav");
                    if (isPlaygroundSubmenu) {
                        const playgroundContainer = document.getElementById("playground-container");
                        exampleContainer.style.height = `calc(${playgroundContainer.getBoundingClientRect().height + 26}px - 4rem)`;
                        const sideBarWidth = document.querySelector(".playground-sidebar").offsetWidth;
                        exampleContainer.style.width = `calc(100% - ${sideBarWidth}px - 71px)`;
                    }
                }
            };
        });
        // Set up some key commands
        sandbox.editor.addAction({
            id: "copy-clipboard",
            label: "Save to clipboard",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
            contextMenuGroupId: "run",
            contextMenuOrder: 1.5,
            run: function (ed) {
                window.navigator.clipboard.writeText(location.href.toString()).then(() => ui.flashInfo(i("play_export_clipboard")), (e) => alert(e));
            },
        });
        sandbox.editor.addAction({
            id: "run-js",
            label: "Run the evaluated JavaScript for your TypeScript file",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            contextMenuGroupId: "run",
            contextMenuOrder: 1.5,
            run: function (ed) {
                const runButton = document.getElementById("run-button");
                runButton && runButton.onclick && runButton.onclick({});
            },
        });
        const runButton = document.getElementById("run-button");
        if (runButton) {
            runButton.onclick = () => {
                const run = sandbox.getRunnableJS();
                const runPlugin = plugins.find(p => p.id === "logs");
                createElements_1.activatePlugin(runPlugin, getCurrentPlugin(), sandbox, tabBar, container);
                runtime_1.runWithCustomLogs(run, i);
                const isJS = sandbox.config.useJavaScript;
                ui.flashInfo(i(isJS ? "play_run_js" : "play_run_ts"));
            };
        }
        // Handle the close buttons on the examples
        document.querySelectorAll("button.examples-close").forEach(b => {
            const button = b;
            button.onclick = (e) => {
                const button = e.target;
                const navLI = button.closest("li");
                navLI === null || navLI === void 0 ? void 0 : navLI.classList.remove("open");
            };
        });
        createElements_1.setupSidebarToggle();
        if (document.getElementById("config-container")) {
            createConfigDropdown_1.createConfigDropdown(sandbox, monaco);
            createConfigDropdown_1.updateConfigDropdownForCompilerOptions(sandbox, monaco);
        }
        if (document.getElementById("playground-settings")) {
            const settingsToggle = document.getElementById("playground-settings");
            settingsToggle.onclick = () => {
                const open = settingsToggle.parentElement.classList.contains("open");
                const sidebarTabs = document.querySelector(".playground-plugin-tabview");
                const sidebarContent = document.querySelector(".playground-plugin-container");
                let settingsContent = document.querySelector(".playground-settings-container");
                if (!settingsContent) {
                    settingsContent = document.createElement("div");
                    settingsContent.className = "playground-settings-container playground-plugin-container";
                    const settings = settings_1.settingsPlugin(i, utils);
                    settings.didMount && settings.didMount(sandbox, settingsContent);
                    document.querySelector(".playground-sidebar").appendChild(settingsContent);
                }
                if (open) {
                    sidebarTabs.style.display = "flex";
                    sidebarContent.style.display = "block";
                    settingsContent.style.display = "none";
                }
                else {
                    sidebarTabs.style.display = "none";
                    sidebarContent.style.display = "none";
                    settingsContent.style.display = "block";
                }
                settingsToggle.parentElement.classList.toggle("open");
            };
        }
        // Support grabbing examples from the location hash
        if (location.hash.startsWith("#example")) {
            const exampleName = location.hash.replace("#example/", "").trim();
            sandbox.config.logger.log("Loading example:", exampleName);
            getExample_1.getExampleSourceCode(config.prefix, config.lang, exampleName).then(ex => {
                if (ex.example && ex.code) {
                    const { example, code } = ex;
                    // Update the localstorage showing that you've seen this page
                    if (localStorage) {
                        const seenText = localStorage.getItem("examples-seen") || "{}";
                        const seen = JSON.parse(seenText);
                        seen[example.id] = example.hash;
                        localStorage.setItem("examples-seen", JSON.stringify(seen));
                    }
                    // Set the menu to be the same section as this current example
                    // this happens behind the scene and isn't visible till you hover
                    // const sectionTitle = example.path[0]
                    // const allSectionTitles = document.getElementsByClassName('section-name')
                    // for (const title of allSectionTitles) {
                    //   if (title.textContent === sectionTitle) {
                    //     title.onclick({})
                    //   }
                    // }
                    const allLinks = document.querySelectorAll("example-link");
                    // @ts-ignore
                    for (const link of allLinks) {
                        if (link.textContent === example.title) {
                            link.classList.add("highlight");
                        }
                    }
                    document.title = "TypeScript Playground - " + example.title;
                    sandbox.setText(code);
                }
                else {
                    sandbox.setText("// There was an issue getting the example, bad URL? Check the console in the developer tools");
                }
            });
        }
        // Sets up a way to click between examples
        monaco.languages.registerLinkProvider(sandbox.language, new ExampleHighlight_1.ExampleHighlighter());
        const languageSelector = document.getElementById("language-selector");
        if (languageSelector) {
            const params = new URLSearchParams(location.search);
            languageSelector.options.selectedIndex = params.get("useJavaScript") ? 1 : 0;
            languageSelector.onchange = () => {
                const useJavaScript = languageSelector.value === "JavaScript";
                const query = sandbox.createURLQueryWithCompilerOptions(sandbox, {
                    useJavaScript: useJavaScript ? true : undefined,
                });
                const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
                // @ts-ignore
                document.location = fullURL;
            };
        }
        const ui = createUI_1.createUI();
        const exporter = exporter_1.createExporter(sandbox, monaco, ui);
        const playground = {
            exporter,
            ui,
            registerPlugin,
            plugins,
            getCurrentPlugin,
            tabs,
            setDidUpdateTab,
        };
        window.ts = sandbox.ts;
        window.sandbox = sandbox;
        window.playground = playground;
        console.log(`Using TypeScript ${window.ts.version}`);
        console.log("Available globals:");
        console.log("\twindow.ts", window.ts);
        console.log("\twindow.sandbox", window.sandbox);
        console.log("\twindow.playground", window.playground);
        console.log("\twindow.react", window.react);
        console.log("\twindow.reactDOM", window.reactDOM);
        /** A plugin */
        const activateExternalPlugin = (plugin, autoActivate) => {
            let readyPlugin;
            // Can either be a factory, or object
            if (typeof plugin === "function") {
                const utils = pluginUtils_1.createUtils(sandbox, react);
                readyPlugin = plugin(utils);
            }
            else {
                readyPlugin = plugin;
            }
            if (autoActivate) {
                console.log(readyPlugin);
            }
            playground.registerPlugin(readyPlugin);
            // Auto-select the dev plugin
            const pluginWantsFront = readyPlugin.shouldBeSelected && readyPlugin.shouldBeSelected();
            if (pluginWantsFront || autoActivate) {
                // Auto-select the dev plugin
                createElements_1.activatePlugin(readyPlugin, getCurrentPlugin(), sandbox, tabBar, container);
            }
        };
        // Dev mode plugin
        if (config.supportCustomPlugins && plugins_1.allowConnectingToLocalhost()) {
            window.exports = {};
            console.log("Connecting to dev plugin");
            try {
                // @ts-ignore
                const re = window.require;
                re(["local/index"], (devPlugin) => {
                    console.log("Set up dev plugin from localhost:5000");
                    try {
                        activateExternalPlugin(devPlugin, true);
                    }
                    catch (error) {
                        console.error(error);
                        setTimeout(() => {
                            ui.flashInfo("Error: Could not load dev plugin from localhost:5000");
                        }, 700);
                    }
                });
            }
            catch (error) {
                console.error("Problem loading up the dev plugin");
                console.error(error);
            }
        }
        const downloadPlugin = (plugin, autoEnable) => {
            try {
                // @ts-ignore
                const re = window.require;
                re([`unpkg/${plugin}@latest/dist/index`], (devPlugin) => {
                    activateExternalPlugin(devPlugin, autoEnable);
                });
            }
            catch (error) {
                console.error("Problem loading up the plugin:", plugin);
                console.error(error);
            }
        };
        if (config.supportCustomPlugins) {
            // Grab ones from localstorage
            plugins_1.activePlugins().forEach(p => downloadPlugin(p.module, false));
            // Offer to install one if 'install-plugin' is a query param
            const params = new URLSearchParams(location.search);
            const pluginToInstall = params.get("install-plugin");
            if (pluginToInstall) {
                const alreadyInstalled = plugins_1.activePlugins().find(p => p.module === pluginToInstall);
                if (!alreadyInstalled) {
                    const shouldDoIt = confirm("Would you like to install the third party plugin?\n\n" + pluginToInstall);
                    if (shouldDoIt) {
                        plugins_1.addCustomPlugin(pluginToInstall);
                        downloadPlugin(pluginToInstall, true);
                    }
                }
            }
        }
        if (location.hash.startsWith("#show-examples")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("examples-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        if (location.hash.startsWith("#show-whatisnew")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("whatisnew-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        return playground;
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7SUF5RUEsTUFBTSxzQkFBc0IsR0FBb0IsQ0FBQyx5QkFBZ0IsRUFBRSx1QkFBYSxFQUFFLHVCQUFVLEVBQUUsbUJBQVMsRUFBRSx1QkFBYSxDQUFDLENBQUE7SUFFMUcsUUFBQSxlQUFlLEdBQUcsQ0FDN0IsT0FBZ0IsRUFDaEIsTUFBYyxFQUNkLE1BQXdCLEVBQ3hCLENBQTBCLEVBQzFCLEtBQW1CLEVBQ25CLEVBQUU7UUFDRixNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxhQUFjLENBQUMsYUFBYyxDQUFDLGFBQWMsQ0FBQTtRQUMxRixNQUFNLE9BQU8sR0FBRyw4QkFBYSxFQUFFLENBQUE7UUFDL0IsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXJDLE1BQU0sT0FBTyxHQUFHLDhCQUFhLEVBQUUsQ0FBQTtRQUMvQixnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFckMsTUFBTSxNQUFNLEdBQUcsNkJBQVksRUFBRSxDQUFBO1FBQzdCLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFM0IsTUFBTSxTQUFTLEdBQUcsc0NBQXFCLEVBQUUsQ0FBQTtRQUN6QyxPQUFPLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTlCLE1BQU0sT0FBTyxHQUFHLEVBQXdCLENBQUE7UUFDeEMsTUFBTSxJQUFJLEdBQUcsRUFBeUIsQ0FBQTtRQUV0Qyx3REFBd0Q7UUFDeEQsSUFBSSxZQUFpRyxDQUFBO1FBRXJHLE1BQU0sY0FBYyxHQUFHLENBQUMsTUFBd0IsRUFBRSxFQUFFO1lBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFcEIsTUFBTSxHQUFHLEdBQUcs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LGVBQWUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDcEQsSUFBSSxlQUFlLEVBQUU7Z0JBQ25CLE1BQU0sZ0JBQWdCLEdBQUcsdUJBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssZUFBZSxDQUFDLENBQUE7Z0JBQ2hGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtvQkFDckIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLHVEQUF1RCxHQUFHLGVBQWUsQ0FBQyxDQUFBO29CQUNyRyxJQUFJLFVBQVUsRUFBRTt3QkFDZCx5QkFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFBO3dCQUNoQyxjQUFjLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFBO3FCQUN0QztpQkFDRjthQUNGO1NBQ0Y7UUFFRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDOUMsVUFBVSxDQUFDLEdBQUcsRUFBRTs7Z0JBQ2QsTUFBQSxRQUFRLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLDBDQUFFLEtBQUssR0FBRTtZQUNyRCxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7U0FDUjtRQUVELElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRTtZQUMvQyxVQUFVLENBQUMsR0FBRyxFQUFFOztnQkFDZCxNQUFBLFFBQVEsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsMENBQUUsS0FBSyxHQUFFO1lBQ3RELENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtTQUNSO1FBRUQsT0FBTyxVQUFVLENBQUE7SUFDbkIsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsidHlwZSBTYW5kYm94ID0gaW1wb3J0KFwidHlwZXNjcmlwdC1zYW5kYm94XCIpLlNhbmRib3hcbnR5cGUgTW9uYWNvID0gdHlwZW9mIGltcG9ydChcIm1vbmFjby1lZGl0b3JcIilcblxuZGVjbGFyZSBjb25zdCB3aW5kb3c6IGFueVxuXG5pbXBvcnQgeyBjb21waWxlZEpTUGx1Z2luIH0gZnJvbSBcIi4vc2lkZWJhci9zaG93SlNcIlxuaW1wb3J0IHtcbiAgY3JlYXRlU2lkZWJhcixcbiAgY3JlYXRlVGFiRm9yUGx1Z2luLFxuICBjcmVhdGVUYWJCYXIsXG4gIGNyZWF0ZVBsdWdpbkNvbnRhaW5lcixcbiAgYWN0aXZhdGVQbHVnaW4sXG4gIGNyZWF0ZURyYWdCYXIsXG4gIHNldHVwU2lkZWJhclRvZ2dsZSxcbn0gZnJvbSBcIi4vY3JlYXRlRWxlbWVudHNcIlxuaW1wb3J0IHsgc2hvd0RUU1BsdWdpbiB9IGZyb20gXCIuL3NpZGViYXIvc2hvd0RUU1wiXG5pbXBvcnQgeyBydW5XaXRoQ3VzdG9tTG9ncywgcnVuUGx1Z2luIH0gZnJvbSBcIi4vc2lkZWJhci9ydW50aW1lXCJcbmltcG9ydCB7IGNyZWF0ZUV4cG9ydGVyIH0gZnJvbSBcIi4vZXhwb3J0ZXJcIlxuaW1wb3J0IHsgY3JlYXRlVUkgfSBmcm9tIFwiLi9jcmVhdGVVSVwiXG5pbXBvcnQgeyBnZXRFeGFtcGxlU291cmNlQ29kZSB9IGZyb20gXCIuL2dldEV4YW1wbGVcIlxuaW1wb3J0IHsgRXhhbXBsZUhpZ2hsaWdodGVyIH0gZnJvbSBcIi4vbW9uYWNvL0V4YW1wbGVIaWdobGlnaHRcIlxuaW1wb3J0IHsgY3JlYXRlQ29uZmlnRHJvcGRvd24sIHVwZGF0ZUNvbmZpZ0Ryb3Bkb3duRm9yQ29tcGlsZXJPcHRpb25zIH0gZnJvbSBcIi4vY3JlYXRlQ29uZmlnRHJvcGRvd25cIlxuaW1wb3J0IHsgc2hvd0Vycm9ycyB9IGZyb20gXCIuL3NpZGViYXIvc2hvd0Vycm9yc1wiXG5pbXBvcnQgeyBvcHRpb25zUGx1Z2luLCBhbGxvd0Nvbm5lY3RpbmdUb0xvY2FsaG9zdCwgYWN0aXZlUGx1Z2lucywgYWRkQ3VzdG9tUGx1Z2luIH0gZnJvbSBcIi4vc2lkZWJhci9wbHVnaW5zXCJcbmltcG9ydCB7IGNyZWF0ZVV0aWxzLCBQbHVnaW5VdGlscyB9IGZyb20gXCIuL3BsdWdpblV0aWxzXCJcbmltcG9ydCB0eXBlIFJlYWN0IGZyb20gXCJyZWFjdFwiXG5pbXBvcnQgeyBzZXR0aW5nc1BsdWdpbiB9IGZyb20gXCIuL3NpZGViYXIvc2V0dGluZ3NcIlxuXG5leHBvcnQgeyBQbHVnaW5VdGlscyB9IGZyb20gXCIuL3BsdWdpblV0aWxzXCJcblxuZXhwb3J0IHR5cGUgUGx1Z2luRmFjdG9yeSA9IHtcbiAgKGk6IChrZXk6IHN0cmluZywgY29tcG9uZW50cz86IGFueSkgPT4gc3RyaW5nLCB1dGlsczogUGx1Z2luVXRpbHMpOiBQbGF5Z3JvdW5kUGx1Z2luXG59XG5cbi8qKiBUaGUgaW50ZXJmYWNlIG9mIGFsbCBzaWRlYmFyIHBsdWdpbnMgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxheWdyb3VuZFBsdWdpbiB7XG4gIC8qKiBOb3QgcHVibGljIGZhY2luZywgYnV0IHVzZWQgYnkgdGhlIHBsYXlncm91bmQgdG8gdW5pcXVlbHkgaWRlbnRpZnkgcGx1Z2lucyAqL1xuICBpZDogc3RyaW5nXG4gIC8qKiBUbyBzaG93IGluIHRoZSB0YWJzICovXG4gIGRpc3BsYXlOYW1lOiBzdHJpbmdcbiAgLyoqIFNob3VsZCB0aGlzIHBsdWdpbiBiZSBzZWxlY3RlZCB3aGVuIHRoZSBwbHVnaW4gaXMgZmlyc3QgbG9hZGVkPyBMZXQncyB5b3UgY2hlY2sgZm9yIHF1ZXJ5IHZhcnMgZXRjIHRvIGxvYWQgYSBwYXJ0aWN1bGFyIHBsdWdpbiAqL1xuICBzaG91bGRCZVNlbGVjdGVkPzogKCkgPT4gYm9vbGVhblxuICAvKiogQmVmb3JlIHdlIHNob3cgdGhlIHRhYiwgdXNlIHRoaXMgdG8gc2V0IHVwIHlvdXIgSFRNTCAtIGl0IHdpbGwgYWxsIGJlIHJlbW92ZWQgYnkgdGhlIHBsYXlncm91bmQgd2hlbiBzb21lb25lIG5hdmlnYXRlcyBvZmYgdGhlIHRhYiAqL1xuICB3aWxsTW91bnQ/OiAoc2FuZGJveDogU2FuZGJveCwgY29udGFpbmVyOiBIVE1MRGl2RWxlbWVudCkgPT4gdm9pZFxuICAvKiogQWZ0ZXIgd2Ugc2hvdyB0aGUgdGFiICovXG4gIGRpZE1vdW50PzogKHNhbmRib3g6IFNhbmRib3gsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIE1vZGVsIGNoYW5nZXMgd2hpbGUgdGhpcyBwbHVnaW4gaXMgYWN0aXZlbHkgc2VsZWN0ZWQgICovXG4gIG1vZGVsQ2hhbmdlZD86IChzYW5kYm94OiBTYW5kYm94LCBtb2RlbDogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSVRleHRNb2RlbCwgY29udGFpbmVyOiBIVE1MRGl2RWxlbWVudCkgPT4gdm9pZFxuICAvKiogRGVsYXllZCBtb2RlbCBjaGFuZ2VzIHdoaWxlIHRoaXMgcGx1Z2luIGlzIGFjdGl2ZWx5IHNlbGVjdGVkLCB1c2VmdWwgd2hlbiB5b3UgYXJlIHdvcmtpbmcgd2l0aCB0aGUgVFMgQVBJIGJlY2F1c2UgaXQgd29uJ3QgcnVuIG9uIGV2ZXJ5IGtleXByZXNzICovXG4gIG1vZGVsQ2hhbmdlZERlYm91bmNlPzogKFxuICAgIHNhbmRib3g6IFNhbmRib3gsXG4gICAgbW9kZWw6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklUZXh0TW9kZWwsXG4gICAgY29udGFpbmVyOiBIVE1MRGl2RWxlbWVudFxuICApID0+IHZvaWRcbiAgLyoqIEJlZm9yZSB3ZSByZW1vdmUgdGhlIHRhYiAqL1xuICB3aWxsVW5tb3VudD86IChzYW5kYm94OiBTYW5kYm94LCBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50KSA9PiB2b2lkXG4gIC8qKiBBZnRlciB3ZSByZW1vdmUgdGhlIHRhYiAqL1xuICBkaWRVbm1vdW50PzogKHNhbmRib3g6IFNhbmRib3gsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIEFuIG9iamVjdCB5b3UgY2FuIHVzZSB0byBrZWVwIGRhdGEgYXJvdW5kIGluIHRoZSBzY29wZSBvZiB5b3VyIHBsdWdpbiBvYmplY3QgKi9cbiAgZGF0YT86IGFueVxufVxuXG5pbnRlcmZhY2UgUGxheWdyb3VuZENvbmZpZyB7XG4gIC8qKiBMYW5ndWFnZSBsaWtlIFwiZW5cIiAvIFwiamFcIiBldGMgKi9cbiAgbGFuZzogc3RyaW5nXG4gIC8qKiBTaXRlIHByZWZpeCwgbGlrZSBcInYyXCIgZHVyaW5nIHRoZSBwcmUtcmVsZWFzZSAqL1xuICBwcmVmaXg6IHN0cmluZ1xuICAvKiogT3B0aW9uYWwgcGx1Z2lucyBzbyB0aGF0IHdlIGNhbiByZS11c2UgdGhlIHBsYXlncm91bmQgd2l0aCBkaWZmZXJlbnQgc2lkZWJhcnMgKi9cbiAgcGx1Z2lucz86IFBsdWdpbkZhY3RvcnlbXVxuICAvKiogU2hvdWxkIHRoaXMgcGxheWdyb3VuZCBsb2FkIHVwIGN1c3RvbSBwbHVnaW5zIGZyb20gbG9jYWxTdG9yYWdlPyAqL1xuICBzdXBwb3J0Q3VzdG9tUGx1Z2luczogYm9vbGVhblxufVxuXG5jb25zdCBkZWZhdWx0UGx1Z2luRmFjdG9yaWVzOiBQbHVnaW5GYWN0b3J5W10gPSBbY29tcGlsZWRKU1BsdWdpbiwgc2hvd0RUU1BsdWdpbiwgc2hvd0Vycm9ycywgcnVuUGx1Z2luLCBvcHRpb25zUGx1Z2luXVxuXG5leHBvcnQgY29uc3Qgc2V0dXBQbGF5Z3JvdW5kID0gKFxuICBzYW5kYm94OiBTYW5kYm94LFxuICBtb25hY286IE1vbmFjbyxcbiAgY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnLFxuICBpOiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZyxcbiAgcmVhY3Q6IHR5cGVvZiBSZWFjdFxuKSA9PiB7XG4gIGNvbnN0IHBsYXlncm91bmRQYXJlbnQgPSBzYW5kYm94LmdldERvbU5vZGUoKS5wYXJlbnRFbGVtZW50IS5wYXJlbnRFbGVtZW50IS5wYXJlbnRFbGVtZW50IVxuICBjb25zdCBkcmFnQmFyID0gY3JlYXRlRHJhZ0JhcigpXG4gIHBsYXlncm91bmRQYXJlbnQuYXBwZW5kQ2hpbGQoZHJhZ0JhcilcblxuICBjb25zdCBzaWRlYmFyID0gY3JlYXRlU2lkZWJhcigpXG4gIHBsYXlncm91bmRQYXJlbnQuYXBwZW5kQ2hpbGQoc2lkZWJhcilcblxuICBjb25zdCB0YWJCYXIgPSBjcmVhdGVUYWJCYXIoKVxuICBzaWRlYmFyLmFwcGVuZENoaWxkKHRhYkJhcilcblxuICBjb25zdCBjb250YWluZXIgPSBjcmVhdGVQbHVnaW5Db250YWluZXIoKVxuICBzaWRlYmFyLmFwcGVuZENoaWxkKGNvbnRhaW5lcilcblxuICBjb25zdCBwbHVnaW5zID0gW10gYXMgUGxheWdyb3VuZFBsdWdpbltdXG4gIGNvbnN0IHRhYnMgPSBbXSBhcyBIVE1MQnV0dG9uRWxlbWVudFtdXG5cbiAgLy8gTGV0J3MgdGhpbmdzIGxpa2UgdGhlIHdvcmtiZW5jaCBob29rIGludG8gdGFiIGNoYW5nZXNcbiAgbGV0IGRpZFVwZGF0ZVRhYjogKG5ld1BsdWdpbjogUGxheWdyb3VuZFBsdWdpbiwgcHJldmlvdXNQbHVnaW46IFBsYXlncm91bmRQbHVnaW4pID0+IHZvaWQgfCB1bmRlZmluZWRcblxuICBjb25zdCByZWdpc3RlclBsdWdpbiA9IChwbHVnaW46IFBsYXlncm91bmRQbHVnaW4pID0+IHtcbiAgICBwbHVnaW5zLnB1c2gocGx1Z2luKVxuXG4gICAgY29uc3QgdGFiID0gY3JlYXRlVGFiRm9yUGx1Z2luKHBsdWdpbilcbiAgICB0YWJzLnB1c2godGFiKVxuXG4gICAgY29uc3QgdGFiQ2xpY2tlZDogSFRNTEVsZW1lbnRbXCJvbmNsaWNrXCJdID0gZSA9PiB7XG4gICAgICBjb25zdCBwcmV2aW91c1BsdWdpbiA9IGdldEN1cnJlbnRQbHVnaW4oKVxuICAgICAgY29uc3QgbmV3VGFiID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnRcbiAgICAgIGNvbnN0IG5ld1BsdWdpbiA9IHBsdWdpbnMuZmluZChwID0+IHAuZGlzcGxheU5hbWUgPT0gbmV3VGFiLnRleHRDb250ZW50KSFcbiAgICAgIGFjdGl2YXRlUGx1Z2luKG5ld1BsdWdpbiwgcHJldmlvdXNQbHVnaW4sIHNhbmRib3gsIHRhYkJhciwgY29udGFpbmVyKVxuICAgICAgZGlkVXBkYXRlVGFiICYmIGRpZFVwZGF0ZVRhYihuZXdQbHVnaW4sIHByZXZpb3VzUGx1Z2luKVxuICAgIH1cblxuICAgIHRhYkJhci5hcHBlbmRDaGlsZCh0YWIpXG4gICAgdGFiLm9uY2xpY2sgPSB0YWJDbGlja2VkXG4gIH1cblxuICBjb25zdCBzZXREaWRVcGRhdGVUYWIgPSAoZnVuYzogKG5ld1BsdWdpbjogUGxheWdyb3VuZFBsdWdpbiwgcHJldmlvdXNQbHVnaW46IFBsYXlncm91bmRQbHVnaW4pID0+IHZvaWQpID0+IHtcbiAgICBkaWRVcGRhdGVUYWIgPSBmdW5jXG4gIH1cblxuICBjb25zdCBnZXRDdXJyZW50UGx1Z2luID0gKCkgPT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkVGFiID0gdGFicy5maW5kKHQgPT4gdC5jbGFzc0xpc3QuY29udGFpbnMoXCJhY3RpdmVcIikpIVxuICAgIHJldHVybiBwbHVnaW5zW3RhYnMuaW5kZXhPZihzZWxlY3RlZFRhYildXG4gIH1cblxuICBjb25zdCBkZWZhdWx0UGx1Z2lucyA9IGNvbmZpZy5wbHVnaW5zIHx8IGRlZmF1bHRQbHVnaW5GYWN0b3JpZXNcbiAgY29uc3QgdXRpbHMgPSBjcmVhdGVVdGlscyhzYW5kYm94LCByZWFjdClcbiAgY29uc3QgaW5pdGlhbFBsdWdpbnMgPSBkZWZhdWx0UGx1Z2lucy5tYXAoZiA9PiBmKGksIHV0aWxzKSlcbiAgaW5pdGlhbFBsdWdpbnMuZm9yRWFjaChwID0+IHJlZ2lzdGVyUGx1Z2luKHApKVxuXG4gIC8vIENob29zZSB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWRcbiAgY29uc3QgcHJpb3JpdHlQbHVnaW4gPSBwbHVnaW5zLmZpbmQocGx1Z2luID0+IHBsdWdpbi5zaG91bGRCZVNlbGVjdGVkICYmIHBsdWdpbi5zaG91bGRCZVNlbGVjdGVkKCkpXG4gIGNvbnN0IHNlbGVjdGVkUGx1Z2luID0gcHJpb3JpdHlQbHVnaW4gfHwgcGx1Z2luc1swXVxuICBjb25zdCBzZWxlY3RlZFRhYiA9IHRhYnNbcGx1Z2lucy5pbmRleE9mKHNlbGVjdGVkUGx1Z2luKV0hXG4gIHNlbGVjdGVkVGFiLm9uY2xpY2shKHsgdGFyZ2V0OiBzZWxlY3RlZFRhYiB9IGFzIGFueSlcblxuICBsZXQgZGVib3VuY2luZ1RpbWVyID0gZmFsc2VcbiAgc2FuZGJveC5lZGl0b3Iub25EaWRDaGFuZ2VNb2RlbENvbnRlbnQoX2V2ZW50ID0+IHtcbiAgICBjb25zdCBwbHVnaW4gPSBnZXRDdXJyZW50UGx1Z2luKClcbiAgICBpZiAocGx1Z2luLm1vZGVsQ2hhbmdlZCkgcGx1Z2luLm1vZGVsQ2hhbmdlZChzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCksIGNvbnRhaW5lcilcblxuICAgIC8vIFRoaXMgbmVlZHMgdG8gYmUgbGFzdCBpbiB0aGUgZnVuY3Rpb25cbiAgICBpZiAoZGVib3VuY2luZ1RpbWVyKSByZXR1cm5cbiAgICBkZWJvdW5jaW5nVGltZXIgPSB0cnVlXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkZWJvdW5jaW5nVGltZXIgPSBmYWxzZVxuICAgICAgcGxheWdyb3VuZERlYm91bmNlZE1haW5GdW5jdGlvbigpXG5cbiAgICAgIC8vIE9ubHkgY2FsbCB0aGUgcGx1Z2luIGZ1bmN0aW9uIG9uY2UgZXZlcnkgMC4zc1xuICAgICAgaWYgKHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZSAmJiBwbHVnaW4uZGlzcGxheU5hbWUgPT09IGdldEN1cnJlbnRQbHVnaW4oKS5kaXNwbGF5TmFtZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkRlYm91bmNlZFwiLCBjb250YWluZXIpXG4gICAgICAgIHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZShzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCksIGNvbnRhaW5lcilcbiAgICAgIH1cbiAgICB9LCAzMDApXG4gIH0pXG5cbiAgLy8gU2V0cyB0aGUgVVJMIGFuZCBzdG9yYWdlIG9mIHRoZSBzYW5kYm94IHN0cmluZ1xuICBjb25zdCBwbGF5Z3JvdW5kRGVib3VuY2VkTWFpbkZ1bmN0aW9uID0gKCkgPT4ge1xuICAgIGNvbnN0IGFsd2F5c1VwZGF0ZVVSTCA9ICFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImRpc2FibGUtc2F2ZS1vbi10eXBlXCIpXG4gICAgaWYgKGFsd2F5c1VwZGF0ZVVSTCkge1xuICAgICAgY29uc3QgbmV3VVJMID0gc2FuZGJveC5jcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveClcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgXCJcIiwgbmV3VVJMKVxuICAgIH1cblxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwic2FuZGJveC1oaXN0b3J5XCIsIHNhbmRib3guZ2V0VGV4dCgpKVxuICB9XG5cbiAgLy8gV2hlbiBhbnkgY29tcGlsZXIgZmxhZ3MgYXJlIGNoYW5nZWQsIHRyaWdnZXIgYSBwb3RlbnRpYWwgY2hhbmdlIHRvIHRoZSBVUkxcbiAgc2FuZGJveC5zZXREaWRVcGRhdGVDb21waWxlclNldHRpbmdzKCgpID0+IHtcbiAgICBwbGF5Z3JvdW5kRGVib3VuY2VkTWFpbkZ1bmN0aW9uKClcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgd2luZG93LmFwcEluc2lnaHRzLnRyYWNrRXZlbnQoeyBuYW1lOiBcIkNvbXBpbGVyIFNldHRpbmdzIGNoYW5nZWRcIiB9KVxuXG4gICAgY29uc3QgbW9kZWwgPSBzYW5kYm94LmVkaXRvci5nZXRNb2RlbCgpXG4gICAgY29uc3QgcGx1Z2luID0gZ2V0Q3VycmVudFBsdWdpbigpXG4gICAgaWYgKG1vZGVsICYmIHBsdWdpbi5tb2RlbENoYW5nZWQpIHBsdWdpbi5tb2RlbENoYW5nZWQoc2FuZGJveCwgbW9kZWwsIGNvbnRhaW5lcilcbiAgICBpZiAobW9kZWwgJiYgcGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlKSBwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2Uoc2FuZGJveCwgbW9kZWwsIGNvbnRhaW5lcilcbiAgfSlcblxuICAvLyBTZXR1cCB3b3JraW5nIHdpdGggdGhlIGV4aXN0aW5nIFVJLCBvbmNlIGl0J3MgbG9hZGVkXG5cbiAgLy8gVmVyc2lvbnMgb2YgVHlwZVNjcmlwdFxuXG4gIC8vIFNldCB1cCB0aGUgbGFiZWwgZm9yIHRoZSBkcm9wZG93blxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiI3ZlcnNpb25zID4gYVwiKS5pdGVtKDApLmlubmVySFRNTCA9IFwidlwiICsgc2FuZGJveC50cy52ZXJzaW9uICsgXCIgPHNwYW4gY2xhc3M9J2NhcmV0Jy8+XCJcblxuICAvLyBBZGQgdGhlIHZlcnNpb25zIHRvIHRoZSBkcm9wZG93blxuICBjb25zdCB2ZXJzaW9uc01lbnUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiI3ZlcnNpb25zID4gdWxcIikuaXRlbSgwKVxuXG4gIGNvbnN0IG5vdFdvcmtpbmdJblBsYXlncm91bmQgPSBbXCIzLjEuNlwiLCBcIjMuMC4xXCIsIFwiMi44LjFcIiwgXCIyLjcuMlwiLCBcIjIuNC4xXCJdXG5cbiAgY29uc3QgYWxsVmVyc2lvbnMgPSBbXG4gICAgXCIzLjkuMC1iZXRhXCIsXG4gICAgLi4uc2FuZGJveC5zdXBwb3J0ZWRWZXJzaW9ucy5maWx0ZXIoZiA9PiAhbm90V29ya2luZ0luUGxheWdyb3VuZC5pbmNsdWRlcyhmKSksXG4gICAgXCJOaWdodGx5XCIsXG4gIF1cblxuICBhbGxWZXJzaW9ucy5mb3JFYWNoKCh2OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgIGNvbnN0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKVxuICAgIGEudGV4dENvbnRlbnQgPSB2XG4gICAgYS5ocmVmID0gXCIjXCJcblxuICAgIGlmICh2ID09PSBcIk5pZ2h0bHlcIikge1xuICAgICAgbGkuY2xhc3NMaXN0LmFkZChcIm5pZ2h0bHlcIilcbiAgICB9XG5cbiAgICBpZiAodi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwiYmV0YVwiKSkge1xuICAgICAgbGkuY2xhc3NMaXN0LmFkZChcImJldGFcIilcbiAgICB9XG5cbiAgICBsaS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudFVSTCA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGN1cnJlbnRVUkwuc3BsaXQoXCIjXCIpWzBdKVxuICAgICAgY29uc3QgdmVyc2lvbiA9IHYgPT09IFwiTmlnaHRseVwiID8gXCJuZXh0XCIgOiB2XG4gICAgICBwYXJhbXMuc2V0KFwidHNcIiwgdmVyc2lvbilcblxuICAgICAgY29uc3QgaGFzaCA9IGRvY3VtZW50LmxvY2F0aW9uLmhhc2gubGVuZ3RoID8gZG9jdW1lbnQubG9jYXRpb24uaGFzaCA6IFwiXCJcbiAgICAgIGNvbnN0IG5ld1VSTCA9IGAke2RvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sfS8vJHtkb2N1bWVudC5sb2NhdGlvbi5ob3N0fSR7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9PyR7cGFyYW1zfSR7aGFzaH1gXG5cbiAgICAgIC8vIEB0cy1pZ25vcmUgLSBpdCBpcyBhbGxvd2VkXG4gICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IG5ld1VSTFxuICAgIH1cblxuICAgIGxpLmFwcGVuZENoaWxkKGEpXG4gICAgdmVyc2lvbnNNZW51LmFwcGVuZENoaWxkKGxpKVxuICB9KVxuXG4gIC8vIFN1cHBvcnQgZHJvcGRvd25zXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIubmF2YmFyLXN1YiBsaS5kcm9wZG93biA+IGFcIikuZm9yRWFjaChsaW5rID0+IHtcbiAgICBjb25zdCBhID0gbGluayBhcyBIVE1MQW5jaG9yRWxlbWVudFxuICAgIGEub25jbGljayA9IF9lID0+IHtcbiAgICAgIGlmIChhLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC5jb250YWlucyhcIm9wZW5cIikpIHtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5uYXZiYXItc3ViIGxpLm9wZW5cIikuZm9yRWFjaChpID0+IGkuY2xhc3NMaXN0LnJlbW92ZShcIm9wZW5cIikpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGkub3BlblwiKS5mb3JFYWNoKGkgPT4gaS5jbGFzc0xpc3QucmVtb3ZlKFwib3BlblwiKSlcbiAgICAgICAgYS5wYXJlbnRFbGVtZW50IS5jbGFzc0xpc3QudG9nZ2xlKFwib3BlblwiKVxuXG4gICAgICAgIGNvbnN0IGV4YW1wbGVDb250YWluZXIgPSBhLmNsb3Nlc3QoXCJsaVwiKSEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1bFwiKS5pdGVtKDApIVxuXG4gICAgICAgIC8vIFNldCBleGFjdCBoZWlnaHQgYW5kIHdpZHRocyBmb3IgdGhlIHBvcG92ZXJzIGZvciB0aGUgbWFpbiBwbGF5Z3JvdW5kIG5hdmlnYXRpb25cbiAgICAgICAgY29uc3QgaXNQbGF5Z3JvdW5kU3VibWVudSA9ICEhYS5jbG9zZXN0KFwibmF2XCIpXG4gICAgICAgIGlmIChpc1BsYXlncm91bmRTdWJtZW51KSB7XG4gICAgICAgICAgY29uc3QgcGxheWdyb3VuZENvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWdyb3VuZC1jb250YWluZXJcIikhXG4gICAgICAgICAgZXhhbXBsZUNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBgY2FsYygke3BsYXlncm91bmRDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0ICsgMjZ9cHggLSA0cmVtKWBcblxuICAgICAgICAgIGNvbnN0IHNpZGVCYXJXaWR0aCA9IChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnBsYXlncm91bmQtc2lkZWJhclwiKSBhcyBhbnkpLm9mZnNldFdpZHRoXG4gICAgICAgICAgZXhhbXBsZUNvbnRhaW5lci5zdHlsZS53aWR0aCA9IGBjYWxjKDEwMCUgLSAke3NpZGVCYXJXaWR0aH1weCAtIDcxcHgpYFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIC8vIFNldCB1cCBzb21lIGtleSBjb21tYW5kc1xuICBzYW5kYm94LmVkaXRvci5hZGRBY3Rpb24oe1xuICAgIGlkOiBcImNvcHktY2xpcGJvYXJkXCIsXG4gICAgbGFiZWw6IFwiU2F2ZSB0byBjbGlwYm9hcmRcIixcbiAgICBrZXliaW5kaW5nczogW21vbmFjby5LZXlNb2QuQ3RybENtZCB8IG1vbmFjby5LZXlDb2RlLktFWV9TXSxcblxuICAgIGNvbnRleHRNZW51R3JvdXBJZDogXCJydW5cIixcbiAgICBjb250ZXh0TWVudU9yZGVyOiAxLjUsXG5cbiAgICBydW46IGZ1bmN0aW9uIChlZCkge1xuICAgICAgd2luZG93Lm5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGxvY2F0aW9uLmhyZWYudG9TdHJpbmcoKSkudGhlbihcbiAgICAgICAgKCkgPT4gdWkuZmxhc2hJbmZvKGkoXCJwbGF5X2V4cG9ydF9jbGlwYm9hcmRcIikpLFxuICAgICAgICAoZTogYW55KSA9PiBhbGVydChlKVxuICAgICAgKVxuICAgIH0sXG4gIH0pXG5cbiAgc2FuZGJveC5lZGl0b3IuYWRkQWN0aW9uKHtcbiAgICBpZDogXCJydW4tanNcIixcbiAgICBsYWJlbDogXCJSdW4gdGhlIGV2YWx1YXRlZCBKYXZhU2NyaXB0IGZvciB5b3VyIFR5cGVTY3JpcHQgZmlsZVwiLFxuICAgIGtleWJpbmRpbmdzOiBbbW9uYWNvLktleU1vZC5DdHJsQ21kIHwgbW9uYWNvLktleUNvZGUuRW50ZXJdLFxuXG4gICAgY29udGV4dE1lbnVHcm91cElkOiBcInJ1blwiLFxuICAgIGNvbnRleHRNZW51T3JkZXI6IDEuNSxcblxuICAgIHJ1bjogZnVuY3Rpb24gKGVkKSB7XG4gICAgICBjb25zdCBydW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ1bi1idXR0b25cIilcbiAgICAgIHJ1bkJ1dHRvbiAmJiBydW5CdXR0b24ub25jbGljayAmJiBydW5CdXR0b24ub25jbGljayh7fSBhcyBhbnkpXG4gICAgfSxcbiAgfSlcblxuICBjb25zdCBydW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ1bi1idXR0b25cIilcbiAgaWYgKHJ1bkJ1dHRvbikge1xuICAgIHJ1bkJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgcnVuID0gc2FuZGJveC5nZXRSdW5uYWJsZUpTKClcbiAgICAgIGNvbnN0IHJ1blBsdWdpbiA9IHBsdWdpbnMuZmluZChwID0+IHAuaWQgPT09IFwibG9nc1wiKSFcbiAgICAgIGFjdGl2YXRlUGx1Z2luKHJ1blBsdWdpbiwgZ2V0Q3VycmVudFBsdWdpbigpLCBzYW5kYm94LCB0YWJCYXIsIGNvbnRhaW5lcilcblxuICAgICAgcnVuV2l0aEN1c3RvbUxvZ3MocnVuLCBpKVxuXG4gICAgICBjb25zdCBpc0pTID0gc2FuZGJveC5jb25maWcudXNlSmF2YVNjcmlwdFxuICAgICAgdWkuZmxhc2hJbmZvKGkoaXNKUyA/IFwicGxheV9ydW5fanNcIiA6IFwicGxheV9ydW5fdHNcIikpXG4gICAgfVxuICB9XG5cbiAgLy8gSGFuZGxlIHRoZSBjbG9zZSBidXR0b25zIG9uIHRoZSBleGFtcGxlc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiYnV0dG9uLmV4YW1wbGVzLWNsb3NlXCIpLmZvckVhY2goYiA9PiB7XG4gICAgY29uc3QgYnV0dG9uID0gYiBhcyBIVE1MQnV0dG9uRWxlbWVudFxuICAgIGJ1dHRvbi5vbmNsaWNrID0gKGU6IGFueSkgPT4ge1xuICAgICAgY29uc3QgYnV0dG9uID0gZS50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcbiAgICAgIGNvbnN0IG5hdkxJID0gYnV0dG9uLmNsb3Nlc3QoXCJsaVwiKVxuICAgICAgbmF2TEk/LmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuXCIpXG4gICAgfVxuICB9KVxuXG4gIHNldHVwU2lkZWJhclRvZ2dsZSgpXG5cbiAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29uZmlnLWNvbnRhaW5lclwiKSkge1xuICAgIGNyZWF0ZUNvbmZpZ0Ryb3Bkb3duKHNhbmRib3gsIG1vbmFjbylcbiAgICB1cGRhdGVDb25maWdEcm9wZG93bkZvckNvbXBpbGVyT3B0aW9ucyhzYW5kYm94LCBtb25hY28pXG4gIH1cblxuICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5Z3JvdW5kLXNldHRpbmdzXCIpKSB7XG4gICAgY29uc3Qgc2V0dGluZ3NUb2dnbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXlncm91bmQtc2V0dGluZ3NcIikhXG5cbiAgICBzZXR0aW5nc1RvZ2dsZS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3Qgb3BlbiA9IHNldHRpbmdzVG9nZ2xlLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC5jb250YWlucyhcIm9wZW5cIilcbiAgICAgIGNvbnN0IHNpZGViYXJUYWJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXBsdWdpbi10YWJ2aWV3XCIpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgICBjb25zdCBzaWRlYmFyQ29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1wbHVnaW4tY29udGFpbmVyXCIpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgICBsZXQgc2V0dGluZ3NDb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXNldHRpbmdzLWNvbnRhaW5lclwiKSBhcyBIVE1MRGl2RWxlbWVudFxuICAgICAgaWYgKCFzZXR0aW5nc0NvbnRlbnQpIHtcbiAgICAgICAgc2V0dGluZ3NDb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBzZXR0aW5nc0NvbnRlbnQuY2xhc3NOYW1lID0gXCJwbGF5Z3JvdW5kLXNldHRpbmdzLWNvbnRhaW5lciBwbGF5Z3JvdW5kLXBsdWdpbi1jb250YWluZXJcIlxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHNldHRpbmdzUGx1Z2luKGksIHV0aWxzKVxuICAgICAgICBzZXR0aW5ncy5kaWRNb3VudCAmJiBzZXR0aW5ncy5kaWRNb3VudChzYW5kYm94LCBzZXR0aW5nc0NvbnRlbnQpXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1zaWRlYmFyXCIpIS5hcHBlbmRDaGlsZChzZXR0aW5nc0NvbnRlbnQpXG4gICAgICB9XG5cbiAgICAgIGlmIChvcGVuKSB7XG4gICAgICAgIHNpZGViYXJUYWJzLnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIlxuICAgICAgICBzaWRlYmFyQ29udGVudC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG4gICAgICAgIHNldHRpbmdzQ29udGVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpZGViYXJUYWJzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgICAgICBzaWRlYmFyQ29udGVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICAgICAgc2V0dGluZ3NDb250ZW50LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICAgIH1cbiAgICAgIHNldHRpbmdzVG9nZ2xlLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC50b2dnbGUoXCJvcGVuXCIpXG4gICAgfVxuICB9XG5cbiAgLy8gU3VwcG9ydCBncmFiYmluZyBleGFtcGxlcyBmcm9tIHRoZSBsb2NhdGlvbiBoYXNoXG4gIGlmIChsb2NhdGlvbi5oYXNoLnN0YXJ0c1dpdGgoXCIjZXhhbXBsZVwiKSkge1xuICAgIGNvbnN0IGV4YW1wbGVOYW1lID0gbG9jYXRpb24uaGFzaC5yZXBsYWNlKFwiI2V4YW1wbGUvXCIsIFwiXCIpLnRyaW0oKVxuICAgIHNhbmRib3guY29uZmlnLmxvZ2dlci5sb2coXCJMb2FkaW5nIGV4YW1wbGU6XCIsIGV4YW1wbGVOYW1lKVxuICAgIGdldEV4YW1wbGVTb3VyY2VDb2RlKGNvbmZpZy5wcmVmaXgsIGNvbmZpZy5sYW5nLCBleGFtcGxlTmFtZSkudGhlbihleCA9PiB7XG4gICAgICBpZiAoZXguZXhhbXBsZSAmJiBleC5jb2RlKSB7XG4gICAgICAgIGNvbnN0IHsgZXhhbXBsZSwgY29kZSB9ID0gZXhcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGxvY2Fsc3RvcmFnZSBzaG93aW5nIHRoYXQgeW91J3ZlIHNlZW4gdGhpcyBwYWdlXG4gICAgICAgIGlmIChsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICBjb25zdCBzZWVuVGV4dCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZXhhbXBsZXMtc2VlblwiKSB8fCBcInt9XCJcbiAgICAgICAgICBjb25zdCBzZWVuID0gSlNPTi5wYXJzZShzZWVuVGV4dClcbiAgICAgICAgICBzZWVuW2V4YW1wbGUuaWRdID0gZXhhbXBsZS5oYXNoXG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJleGFtcGxlcy1zZWVuXCIsIEpTT04uc3RyaW5naWZ5KHNlZW4pKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSBtZW51IHRvIGJlIHRoZSBzYW1lIHNlY3Rpb24gYXMgdGhpcyBjdXJyZW50IGV4YW1wbGVcbiAgICAgICAgLy8gdGhpcyBoYXBwZW5zIGJlaGluZCB0aGUgc2NlbmUgYW5kIGlzbid0IHZpc2libGUgdGlsbCB5b3UgaG92ZXJcbiAgICAgICAgLy8gY29uc3Qgc2VjdGlvblRpdGxlID0gZXhhbXBsZS5wYXRoWzBdXG4gICAgICAgIC8vIGNvbnN0IGFsbFNlY3Rpb25UaXRsZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWN0aW9uLW5hbWUnKVxuICAgICAgICAvLyBmb3IgKGNvbnN0IHRpdGxlIG9mIGFsbFNlY3Rpb25UaXRsZXMpIHtcbiAgICAgICAgLy8gICBpZiAodGl0bGUudGV4dENvbnRlbnQgPT09IHNlY3Rpb25UaXRsZSkge1xuICAgICAgICAvLyAgICAgdGl0bGUub25jbGljayh7fSlcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH1cblxuICAgICAgICBjb25zdCBhbGxMaW5rcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJleGFtcGxlLWxpbmtcIilcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBmb3IgKGNvbnN0IGxpbmsgb2YgYWxsTGlua3MpIHtcbiAgICAgICAgICBpZiAobGluay50ZXh0Q29udGVudCA9PT0gZXhhbXBsZS50aXRsZSkge1xuICAgICAgICAgICAgbGluay5jbGFzc0xpc3QuYWRkKFwiaGlnaGxpZ2h0XCIpXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBcIlR5cGVTY3JpcHQgUGxheWdyb3VuZCAtIFwiICsgZXhhbXBsZS50aXRsZVxuICAgICAgICBzYW5kYm94LnNldFRleHQoY29kZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNhbmRib3guc2V0VGV4dChcIi8vIFRoZXJlIHdhcyBhbiBpc3N1ZSBnZXR0aW5nIHRoZSBleGFtcGxlLCBiYWQgVVJMPyBDaGVjayB0aGUgY29uc29sZSBpbiB0aGUgZGV2ZWxvcGVyIHRvb2xzXCIpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8vIFNldHMgdXAgYSB3YXkgdG8gY2xpY2sgYmV0d2VlbiBleGFtcGxlc1xuICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyTGlua1Byb3ZpZGVyKHNhbmRib3gubGFuZ3VhZ2UsIG5ldyBFeGFtcGxlSGlnaGxpZ2h0ZXIoKSlcblxuICBjb25zdCBsYW5ndWFnZVNlbGVjdG9yID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYW5ndWFnZS1zZWxlY3RvclwiKSBhcyBIVE1MU2VsZWN0RWxlbWVudFxuICBpZiAobGFuZ3VhZ2VTZWxlY3Rvcikge1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKVxuICAgIGxhbmd1YWdlU2VsZWN0b3Iub3B0aW9ucy5zZWxlY3RlZEluZGV4ID0gcGFyYW1zLmdldChcInVzZUphdmFTY3JpcHRcIikgPyAxIDogMFxuXG4gICAgbGFuZ3VhZ2VTZWxlY3Rvci5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZUphdmFTY3JpcHQgPSBsYW5ndWFnZVNlbGVjdG9yLnZhbHVlID09PSBcIkphdmFTY3JpcHRcIlxuICAgICAgY29uc3QgcXVlcnkgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94LCB7XG4gICAgICAgIHVzZUphdmFTY3JpcHQ6IHVzZUphdmFTY3JpcHQgPyB0cnVlIDogdW5kZWZpbmVkLFxuICAgICAgfSlcbiAgICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSBmdWxsVVJMXG4gICAgfVxuICB9XG5cbiAgY29uc3QgdWkgPSBjcmVhdGVVSSgpXG4gIGNvbnN0IGV4cG9ydGVyID0gY3JlYXRlRXhwb3J0ZXIoc2FuZGJveCwgbW9uYWNvLCB1aSlcblxuICBjb25zdCBwbGF5Z3JvdW5kID0ge1xuICAgIGV4cG9ydGVyLFxuICAgIHVpLFxuICAgIHJlZ2lzdGVyUGx1Z2luLFxuICAgIHBsdWdpbnMsXG4gICAgZ2V0Q3VycmVudFBsdWdpbixcbiAgICB0YWJzLFxuICAgIHNldERpZFVwZGF0ZVRhYixcbiAgfVxuXG4gIHdpbmRvdy50cyA9IHNhbmRib3gudHNcbiAgd2luZG93LnNhbmRib3ggPSBzYW5kYm94XG4gIHdpbmRvdy5wbGF5Z3JvdW5kID0gcGxheWdyb3VuZFxuXG4gIGNvbnNvbGUubG9nKGBVc2luZyBUeXBlU2NyaXB0ICR7d2luZG93LnRzLnZlcnNpb259YClcblxuICBjb25zb2xlLmxvZyhcIkF2YWlsYWJsZSBnbG9iYWxzOlwiKVxuICBjb25zb2xlLmxvZyhcIlxcdHdpbmRvdy50c1wiLCB3aW5kb3cudHMpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnNhbmRib3hcIiwgd2luZG93LnNhbmRib3gpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnBsYXlncm91bmRcIiwgd2luZG93LnBsYXlncm91bmQpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnJlYWN0XCIsIHdpbmRvdy5yZWFjdClcbiAgY29uc29sZS5sb2coXCJcXHR3aW5kb3cucmVhY3RET01cIiwgd2luZG93LnJlYWN0RE9NKVxuXG4gIC8qKiBBIHBsdWdpbiAqL1xuICBjb25zdCBhY3RpdmF0ZUV4dGVybmFsUGx1Z2luID0gKFxuICAgIHBsdWdpbjogUGxheWdyb3VuZFBsdWdpbiB8ICgodXRpbHM6IFBsdWdpblV0aWxzKSA9PiBQbGF5Z3JvdW5kUGx1Z2luKSxcbiAgICBhdXRvQWN0aXZhdGU6IGJvb2xlYW5cbiAgKSA9PiB7XG4gICAgbGV0IHJlYWR5UGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luXG4gICAgLy8gQ2FuIGVpdGhlciBiZSBhIGZhY3RvcnksIG9yIG9iamVjdFxuICAgIGlmICh0eXBlb2YgcGx1Z2luID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNvbnN0IHV0aWxzID0gY3JlYXRlVXRpbHMoc2FuZGJveCwgcmVhY3QpXG4gICAgICByZWFkeVBsdWdpbiA9IHBsdWdpbih1dGlscylcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhZHlQbHVnaW4gPSBwbHVnaW5cbiAgICB9XG5cbiAgICBpZiAoYXV0b0FjdGl2YXRlKSB7XG4gICAgICBjb25zb2xlLmxvZyhyZWFkeVBsdWdpbilcbiAgICB9XG5cbiAgICBwbGF5Z3JvdW5kLnJlZ2lzdGVyUGx1Z2luKHJlYWR5UGx1Z2luKVxuXG4gICAgLy8gQXV0by1zZWxlY3QgdGhlIGRldiBwbHVnaW5cbiAgICBjb25zdCBwbHVnaW5XYW50c0Zyb250ID0gcmVhZHlQbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCAmJiByZWFkeVBsdWdpbi5zaG91bGRCZVNlbGVjdGVkKClcblxuICAgIGlmIChwbHVnaW5XYW50c0Zyb250IHx8IGF1dG9BY3RpdmF0ZSkge1xuICAgICAgLy8gQXV0by1zZWxlY3QgdGhlIGRldiBwbHVnaW5cbiAgICAgIGFjdGl2YXRlUGx1Z2luKHJlYWR5UGx1Z2luLCBnZXRDdXJyZW50UGx1Z2luKCksIHNhbmRib3gsIHRhYkJhciwgY29udGFpbmVyKVxuICAgIH1cbiAgfVxuXG4gIC8vIERldiBtb2RlIHBsdWdpblxuICBpZiAoY29uZmlnLnN1cHBvcnRDdXN0b21QbHVnaW5zICYmIGFsbG93Q29ubmVjdGluZ1RvTG9jYWxob3N0KCkpIHtcbiAgICB3aW5kb3cuZXhwb3J0cyA9IHt9XG4gICAgY29uc29sZS5sb2coXCJDb25uZWN0aW5nIHRvIGRldiBwbHVnaW5cIilcbiAgICB0cnkge1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgY29uc3QgcmUgPSB3aW5kb3cucmVxdWlyZVxuICAgICAgcmUoW1wibG9jYWwvaW5kZXhcIl0sIChkZXZQbHVnaW46IGFueSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlNldCB1cCBkZXYgcGx1Z2luIGZyb20gbG9jYWxob3N0OjUwMDBcIilcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhY3RpdmF0ZUV4dGVybmFsUGx1Z2luKGRldlBsdWdpbiwgdHJ1ZSlcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdWkuZmxhc2hJbmZvKFwiRXJyb3I6IENvdWxkIG5vdCBsb2FkIGRldiBwbHVnaW4gZnJvbSBsb2NhbGhvc3Q6NTAwMFwiKVxuICAgICAgICAgIH0sIDcwMClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcIlByb2JsZW0gbG9hZGluZyB1cCB0aGUgZGV2IHBsdWdpblwiKVxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICB9XG4gIH1cblxuICBjb25zdCBkb3dubG9hZFBsdWdpbiA9IChwbHVnaW46IHN0cmluZywgYXV0b0VuYWJsZTogYm9vbGVhbikgPT4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBjb25zdCByZSA9IHdpbmRvdy5yZXF1aXJlXG4gICAgICByZShbYHVucGtnLyR7cGx1Z2lufUBsYXRlc3QvZGlzdC9pbmRleGBdLCAoZGV2UGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB7XG4gICAgICAgIGFjdGl2YXRlRXh0ZXJuYWxQbHVnaW4oZGV2UGx1Z2luLCBhdXRvRW5hYmxlKVxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcIlByb2JsZW0gbG9hZGluZyB1cCB0aGUgcGx1Z2luOlwiLCBwbHVnaW4pXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgIH1cbiAgfVxuXG4gIGlmIChjb25maWcuc3VwcG9ydEN1c3RvbVBsdWdpbnMpIHtcbiAgICAvLyBHcmFiIG9uZXMgZnJvbSBsb2NhbHN0b3JhZ2VcbiAgICBhY3RpdmVQbHVnaW5zKCkuZm9yRWFjaChwID0+IGRvd25sb2FkUGx1Z2luKHAubW9kdWxlLCBmYWxzZSkpXG5cbiAgICAvLyBPZmZlciB0byBpbnN0YWxsIG9uZSBpZiAnaW5zdGFsbC1wbHVnaW4nIGlzIGEgcXVlcnkgcGFyYW1cbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaClcbiAgICBjb25zdCBwbHVnaW5Ub0luc3RhbGwgPSBwYXJhbXMuZ2V0KFwiaW5zdGFsbC1wbHVnaW5cIilcbiAgICBpZiAocGx1Z2luVG9JbnN0YWxsKSB7XG4gICAgICBjb25zdCBhbHJlYWR5SW5zdGFsbGVkID0gYWN0aXZlUGx1Z2lucygpLmZpbmQocCA9PiBwLm1vZHVsZSA9PT0gcGx1Z2luVG9JbnN0YWxsKVxuICAgICAgaWYgKCFhbHJlYWR5SW5zdGFsbGVkKSB7XG4gICAgICAgIGNvbnN0IHNob3VsZERvSXQgPSBjb25maXJtKFwiV291bGQgeW91IGxpa2UgdG8gaW5zdGFsbCB0aGUgdGhpcmQgcGFydHkgcGx1Z2luP1xcblxcblwiICsgcGx1Z2luVG9JbnN0YWxsKVxuICAgICAgICBpZiAoc2hvdWxkRG9JdCkge1xuICAgICAgICAgIGFkZEN1c3RvbVBsdWdpbihwbHVnaW5Ub0luc3RhbGwpXG4gICAgICAgICAgZG93bmxvYWRQbHVnaW4ocGx1Z2luVG9JbnN0YWxsLCB0cnVlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGxvY2F0aW9uLmhhc2guc3RhcnRzV2l0aChcIiNzaG93LWV4YW1wbGVzXCIpKSB7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImV4YW1wbGVzLWJ1dHRvblwiKT8uY2xpY2soKVxuICAgIH0sIDEwMClcbiAgfVxuXG4gIGlmIChsb2NhdGlvbi5oYXNoLnN0YXJ0c1dpdGgoXCIjc2hvdy13aGF0aXNuZXdcIikpIHtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwid2hhdGlzbmV3LWJ1dHRvblwiKT8uY2xpY2soKVxuICAgIH0sIDEwMClcbiAgfVxuXG4gIHJldHVybiBwbGF5Z3JvdW5kXG59XG5cbmV4cG9ydCB0eXBlIFBsYXlncm91bmQgPSBSZXR1cm5UeXBlPHR5cGVvZiBzZXR1cFBsYXlncm91bmQ+XG4iXX0=