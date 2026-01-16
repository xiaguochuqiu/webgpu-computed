
export async function include(path: string, exportDefault = true) {
    if(typeof global !== "undefined" && typeof require !== "undefined") {
        return require(path)
    }
    else {
        let pack = await import(/* @vite-ignore */path)
        if(exportDefault) pack = pack.default
        return pack
    }
}