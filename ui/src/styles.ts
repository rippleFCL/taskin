import Grid from '@mui/material/Grid2';
import styled from '@emotion/styled'
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

const GridItem = styled(Grid)`
background-color: #f9f9f9;
padding: 10px;
border-radius: 5px;
margin: 10px;
border: 1px solid #e0e0e0;
box-shadow: 0 0 10px #e0e0e0;
`
const OuterContainer = styled(Container)`
    padding: 10px;
    `

export {
    Box,
    Grid,
    GridItem,
    OuterContainer
}
