import React from "react"
import useImage from "use-image"
import { Image } from "react-konva";

export interface MyImageProps {
    url: string
    width: number
    height: number
}
export function MyImage({
    url, width, height
}: MyImageProps) {
    const [image] = useImage(url)
    return (
        image ? <Image image={image} width={width} height={height} /> : null
    )
}
