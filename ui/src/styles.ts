import Grid from '@mui/material/Grid2';
import styled from '@emotion/styled'
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Paper, Stack, Badge, BadgeProps } from '@mui/material';

export const fabStyle = {
  position: 'absolute',
  bottom: 16,
  right: 16,
};

export const modelStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export const InlineBadge = styled(Badge)<BadgeProps>(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: -15,
    top: 12,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: '0 4px',
  },
}));

export const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));


export const OuterContainer = styled(Container)`
padding: 10px;
`
