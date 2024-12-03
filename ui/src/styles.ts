import Grid from '@mui/material/Grid2';
import styled from '@emotion/styled'
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Paper, Stack } from '@mui/material';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));


const OuterContainer = styled(Container)`
padding: 10px;
`
export {
    Item,
    Stack,
    Box,
    Grid,
    OuterContainer
}
