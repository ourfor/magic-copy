export function download(name: string, data: Blob) {
    const link = document.createElement("a")
    link.href = URL.createObjectURL(data)
    link.download = name
    link.click()
}