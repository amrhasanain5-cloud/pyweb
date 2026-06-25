    // 1. معرفة الكائن على الـ window عشان بايثون يشوفه
window.DOMBRIDGE = {
    setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },
    getText(id) {
        const el = document.getElementById(id);
        return el ? el.textContent : null;
    },
    getElement(id) {
        return document.getElementById(id);
    },
    onclick(element, func) {
        element.onclick = func;
    },
    getElementbycls(id) {
        return document.getElementsByClassName(id);
    },
    remove(element) {
        element.remove();
    },
    get_value(element) {
        const inp = document.getElementById(element);
        return inp ? inp.value : null;
    }

};

async function startPyWeb() {
    // انتظر تحميل الصفحة
    await new Promise(r => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", r);
        } else {
            r();
        }
    });

    const pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });

    window.pyodide = pyodide;

    // 2. التعديل السحري: بنقول لبايثون روح للـ window وهات منها DOMBRIDGE
    await pyodide.runPython(`
import sys
import types
import js 
from pyodide.ffi import create_proxy
from pyodide.http import pyfetch
import json

# بنجيب الـ DOMBRIDGE من الـ window بتاعة المتصفح مباشرة
dom_bridge = js.window.DOMBRIDGE

class Document:
    def __init__(self):
        self._proxies = []
    def get_element_by_id(self, id):
        return js.document.getElementById(id)

    def setTextbyId(self, id, text):
        dom_bridge.setText(id, text)

    def getTextbyId(self, id):
        return dom_bridge.getText(id)

    def onclick(self, element, func):
        proxy = create_proxy(func)
        self._proxies.append(proxy)
        dom_bridge.onclick(element, proxy)

    def get_element_by_class_name(self, id):
        return dom_bridge.getElementbycls(id)
    def remove(self,element):
        dom_bridge.remove(element)

    def get_value(self,element):
        return dom_bridge.get_value(element)

pyweb = types.ModuleType("pyweb")
document = Document()
pyweb.Document = Document
pyweb.document = document

sys.modules["pyweb"] = pyweb



class Groq:
    def __init__(self, api_key,model):
        self.api_key = api_key
        self.model = model
    async def chat(self, prompt):
        response = await pyfetch(
            "https://api.groq.com/openai/v1/chat/completions",
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            body=json.dumps({
                "model": self.model,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            })
        )

        data = await response.json()
        return data["choices"][0]["message"]["content"]





class openAI:
    def __init__(self, api_key,model):
        self.api_key = api_key
        self.model = model
    async def chat(self, prompt):
        response = await pyfetch(
            "https://api.openai.com/v1/chat/completions",
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            body=json.dumps({
                "model": self.model,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            })
        )

        data = await response.json()
        return data["choices"][0]["message"]["content"]


class Gemini:
    def __init__(self, api_key,model):
        self.api_key = api_key
        self.model = model
    async def chat(self, prompt):
        url = (
            "https://generativelanguage.googleapis.com/v1beta/"
            f"models/{self.model}:generateContent?key={self.api_key}"
        )

        response = await pyfetch(
            url,
            method="POST",
            headers={
                "Content-Type": "application/json"
            },
            body=json.dumps({
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ]
            })
        )

        data = await response.json()

        return data["candidates"][0]["content"]["parts"][0]["text"]

pywebAi = types.ModuleType("pywebAi")

pywebAi.Groq = Groq
pywebAi.openAI = openAI
pywebAi.Gemini = Gemini

sys.modules["pywebAi"] = pywebAi

`);

    // تشغيل ملف x.py
    const scripts = document.querySelectorAll('script[type=pyweb]');
    for (const script of scripts) {
        const src = script.getAttribute("src");
        if (!src) continue;

        const code = await fetch(src).then(r => r.text());
        await pyodide.runPythonAsync(code);
    }
}

startPyWeb();
