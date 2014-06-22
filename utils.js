function overlapExists(actor1, actor2) {
    var pos1 = actor1.get_position(),
        pos2 = actor2.get_position(),
        height1 = actor1.get_height(),
        height2 = actor2.get_height(),
        width1 = actor1.get_width(),
        width2 = actor2.get_width(),
        xOverlap,
        yOverlap;

    // check x overlap
    var xPosDiff = pos2[0] - pos1[0];

    // window 2 is further right than window 1
    if (xPosDiff >= 0) {
        if (width1 >= xPosDiff) {
            xOverlap = true;
        }
    }
    else if (width2 >= xPosDiff) {
            xOverlap = true;
        }
    }
    // x does overlap so windows cannot overlap
    else {
        return false;
    }

    // check y overlap
    var yPosDiff = pos2[0] - pos1[1];

    // window 2 is further down than window 1
    if (yPosDiff >= 0) {
        if (height1 >= yPosDiff) {
            return true;
        }
    }
    else if (height2 >= yPosDiff) {
        return true;
    }

    return false;
}