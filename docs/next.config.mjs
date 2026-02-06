import nextra from 'nextra';

const withNextra = nextra({
    // minimal config
});

export default withNextra({
    output: 'export',
    images: {
        unoptimized: true,
    },
});
