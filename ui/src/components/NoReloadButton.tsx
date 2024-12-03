import { Button } from "@mui/material"
import { ButtonProps } from "@mui/material"
import React from 'react';


export const NoReloadButton: React.FC<ButtonProps> = (props: ButtonProps) => {
    return <Button {...props} onClick={(evt) => { evt.preventDefault(); props.onClick?.(evt)}}>{props.children}</Button>
}

